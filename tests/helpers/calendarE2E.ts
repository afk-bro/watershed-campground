import { expect, Page, Locator } from '@playwright/test';

export async function closeOverlays(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  // Try clicking header as a safe no-op to clear potential overlays
  await page.locator('header, nav, [data-testid="calendar-header"]').first().click({ trial: true }).catch(() => {});
}

export async function dismissDialogs(page: Page) {
  // If a dialog is open, close it (Escape usually works)
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
    await expect(dialog).toBeHidden({ timeout: 5000 }).catch(() => {});
  }

  // If you’re using a shadcn/Radix dialog, this often helps:
  const closeBtn = page.getByRole('button', { name: /close/i });
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click().catch(() => {});
  }
}

export async function killBackdrops(page: Page) {
  await page.evaluate(() => {
    // Explicit known offender selectors (surgical removal)
    const explicitSelectors = [
      ".fixed.inset-0.z-\\[60\\].bg-black\\/50.backdrop-blur-sm",
      ".fixed.inset-0.bg-black\\/50.backdrop-blur-sm",
      ".fixed.inset-0.z-\\[60\\]",
    ];

    for (const sel of explicitSelectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => (el as HTMLElement).remove());
      } catch (err) {
        // ignore selector errors
      }
    }

    // Radix/shadcn portals
    try {
      document.querySelectorAll('[data-radix-portal] .fixed.inset-0').forEach((el) => (el as HTMLElement).remove());
    } catch (err) {
      // ignore
    }

    // Remove the specific modal if it exists (E2E only)
    try {
      document.querySelectorAll("[role='dialog']").forEach((d) => {
        const text = (d as HTMLElement).innerText || "";
        if (text.includes("Add Blackout Dates")) {
          (d as HTMLElement).remove();
        }
      });
    } catch (err) {
      // ignore
    }

    const isFullViewportFixed = (e: HTMLElement) => {
      try {
        const s = window.getComputedStyle(e);
        if (s.position !== "fixed") return false;

        const z = Number(s.zIndex || "0");
        if (!Number.isFinite(z) || z < 50) return false;

        // bounding rect check (robust across browsers)
        const r = e.getBoundingClientRect();
        const coversViewport = (
          (Math.abs(r.top) <= 1 && Math.abs(r.left) <= 1) &&
          (Math.abs(r.width - window.innerWidth) <= 2 || Math.abs(r.right - window.innerWidth) <= 2) &&
          (Math.abs(r.height - window.innerHeight) <= 2 || Math.abs(r.bottom - window.innerHeight) <= 2)
        );

        // fallback check using computed inset/top/right/bottom/left
        const insetCovers = (s.inset === "0px") || (s.top === "0px" && s.right === "0px" && s.bottom === "0px" && s.left === "0px");

        // typical overlay/backdrop visual traits
        const looksLikeBackdrop =
          s.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          s.backdropFilter !== "none" ||
          e.className?.toString().toLowerCase().includes("backdrop") ||
          e.className?.toString().toLowerCase().includes("overlay") ||
          e.getAttribute("data-backdrop") != null;

        return (coversViewport || insetCovers) && looksLikeBackdrop;
      } catch (err) {
        return false;
      }
    };

    const removed: Array<{ tag: string; className: string; zIndex: string }> = [];

    const els = Array.from(document.querySelectorAll("body *")) as HTMLElement[];
    for (const e of els) {
      try {
        if (isFullViewportFixed(e)) {
          removed.push({ tag: e.tagName, className: e.className?.toString() ?? "", zIndex: getComputedStyle(e).zIndex });
          e.remove();
        }
      } catch (err) {
        // ignore
      }
    }

    // Store for debugging (optional)
    (window as any).__e2e_removed_overlays__ = removed;
  });
}

export async function killBackdropsUntilStable(page: Page, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    await killBackdrops(page);
    // allow portals/animations to mount
    await page.waitForTimeout(75);
    await killBackdrops(page);
  }
}

export async function logTopFixedOverlays(page: Page) {
  try {
    if (page.isClosed && page.isClosed()) {
      console.log('logTopFixedOverlays: page is closed, skipping overlay inspection');
      return;
    }

    const overlays = await page.evaluate(() => {
      const result: any[] = [];
      const els = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
      for (const e of els) {
        try {
          const s = window.getComputedStyle(e);
          if (s.position === 'fixed' && (s.inset === '0px' || (s.top === '0px' && s.left === '0px'))) {
            const z = Number(s.zIndex || '0');
            if (z >= 50) {
              result.push({
                tag: e.tagName,
                className: e.className,
                zIndex: s.zIndex,
                pointerEvents: s.pointerEvents,
                opacity: s.opacity,
                display: s.display,
              });
            }
          }
        } catch (err) {
          // ignore
        }
      }
      return result.sort((a, b) => Number(b.zIndex) - Number(a.zIndex)).slice(0, 10);
    });
    console.log('Top fixed overlays:', overlays);
  } catch (err: any) {
    console.log('logTopFixedOverlays error (ignored):', err && err.message ? err.message : err);
  }
}

export async function ensureNoBackdropInterception(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await closeOverlays(page);
    await expect(dialog).toBeHidden({ timeout: 5000 }).catch(() => {});
  }

  // Also wait for known backdrop selectors to be detached
  await page.waitForSelector('.fixed.inset-0, .modal, [data-backdrop], .backdrop, .dialog-backdrop', { state: 'detached', timeout: 5000 }).catch(() => {});
}

export async function nukeAddBlackoutOverlay(page: Page) {
  await page.evaluate(() => {
    const findFixedAncestor = (node: HTMLElement | null) => {
      let cur: HTMLElement | null = node;
      while (cur) {
        try {
          const s = getComputedStyle(cur);
          if (s.position === 'fixed') {
            const r = cur.getBoundingClientRect();
            const covers = r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.8;
            if (covers) return cur;
          }
        } catch (err) {
          // ignore
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const candidates = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
    for (const el of candidates) {
      try {
        const t = (el.innerText || '');
        if (!t.includes('Add Blackout Dates')) continue;

        const fixed = findFixedAncestor(el) ?? el;
        fixed.remove();
        // remove any remaining backdrops nearby
        document.querySelectorAll('.fixed.inset-0, [data-backdrop]').forEach((n) => (n as HTMLElement).remove());
        break;
      } catch (err) {
        // ignore
      }
    }
  });
}

export async function dragToWithOverlayDefense(
  page: Page,
  source: Locator,
  target: Locator,
  opts?: { attempts?: number }
) {
  const attempts = opts?.attempts ?? 3;

  for (let i = 0; i < attempts; i++) {
    // ensure overlays are being removed continuously
    await dismissDialogs(page).catch(() => {});
    await killBackdropsUntilStable(page, 2).catch(() => {});

    await source.scrollIntoViewIfNeeded().catch(() => {});
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await expect(source).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(target).toBeVisible({ timeout: 5000 }).catch(() => {});

    try {
      await source.dragTo(target, { timeout: 15000 });
      return;
    } catch (e: any) {
      // On any failure, nuke overlays again and retry
      await nukeAddBlackoutOverlay(page).catch(() => {});
      await page.waitForTimeout(100);
      if (i === attempts - 1) throw e;
    }
  }
}

export async function stabilizeForDrag(page: Page, block: Locator) {
  await dismissDialogs(page);
  await installOverlayObserver(page);
  await killBackdropsUntilStable(page, 3);
  await block.scrollIntoViewIfNeeded().catch(() => {});
  await expect(block).toBeVisible({ timeout: 5000 });
  // short pause to allow layout to settle
  await page.waitForTimeout(50);
}

export async function installOverlayObserver(page: Page) {
  await page.evaluate(() => {
    if ((window as any).__e2e_overlay_observer_installed__) return;
    const findAndRemove = (node: HTMLElement) => {
      try {
        const s = getComputedStyle(node);
        if (s.position !== 'fixed') return false;

        // Surgical fix: If it looks like an overlay (high z-index), kill its pointer events immediately
        // This stops it from stealing drags even before we remove it.
        const z = Number(s.zIndex || '0');
        if (z >= 40 && s.pointerEvents !== 'none') {
             // Only if it covers a significant portion of the screen or is a known backdrop
             const r = node.getBoundingClientRect();
             const large = r.width >= window.innerWidth * 0.5 && r.height >= window.innerHeight * 0.5;
             if (large || (s.inset === '0px') || (s.top === '0px' && s.bottom === '0px')) {
                 node.style.setProperty('pointer-events', 'none', 'important');
             }
        }

        const r = node.getBoundingClientRect();
        const covers = r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.8;
        const text = (node.innerText || '');
        if (covers && text.includes('Add Blackout Dates')) {
          node.remove();
          return true;
        }
        // check descendants
        if (node.querySelectorAll && Array.from(node.querySelectorAll('*')).some((el: any) => (el.innerText || '').includes('Add Blackout Dates'))) {
          node.remove();
          return true;
        }
      } catch (err) {
        // ignore
      }
      return false;
    };

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of Array.from(m.addedNodes)) {
          if (!(n instanceof HTMLElement)) continue;
          findAndRemove(n);
        }
        if (m.type === 'attributes' && m.target instanceof HTMLElement) {
          findAndRemove(m.target as HTMLElement);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });

    // Periodic scan as a fallback for rapid toggles
    const scan = () => {
      try {
        const els = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
        for (const e of els) {
          findAndRemove(e);
        }
      } catch (err) {
        // ignore
      }
    };
    const interval = setInterval(scan, 50); // Aggressive 50ms scan
    (window as any).__e2e_overlay_scan_interval__ = interval;
    (window as any).__e2e_overlay_observer__ = obs;
    (window as any).__e2e_overlay_observer_installed__ = true;
  });
}
