import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { Campsite, CampsiteType } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: "danger" | "warning" | "info";
  onConfirm: () => void;
}

export function useCampsitesPageState() {
  const [campsites, setCampsites] = useState<Campsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    CampsiteType | "all" | "active" | "inactive"
  >("active");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "",
    variant: "info",
    onConfirm: () => {},
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const fetchCampsites = useCallback(async () => {
    try {
      setLoading(true);
      // Default to showing all for admin list management
      const response = await fetch("/api/admin/campsites?showInactive=true");

      if (!response.ok) {
        throw new Error("Failed to fetch campsites");
      }

      const { data } = await response.json();
      setCampsites(data || []);
    } catch (err) {
      console.error("Error fetching campsites:", err);
      setError("Failed to load campsites");
      showToast("Failed to load campsites", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchCampsites();
  }, [fetchCampsites]);

  function requestToggleActive(
    id: string,
    code: string,
    currentStatus: boolean
  ) {
    setConfirmConfig({
      isOpen: true,
      title: currentStatus ? "Pause Campsite?" : "Start Campsite?",
      message: currentStatus
        ? `Temporarily stop taking reservations for ${code}? Existing bookings will remain valid, but no new ones can be made.`
        : `Make ${code} available for new bookings immediately?`,
      confirmLabel: currentStatus ? "Pause Site" : "Start Site",
      variant: "warning",
      onConfirm: () => toggleActive(id, currentStatus),
    });
  }

  function requestDelete(id: string, code: string) {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Permanently?",
      message: `You are about to permanently delete campsite ${code}. This removes all associated history and cannot be recovered. Are you absolutely sure?`,
      confirmLabel: "Delete Site",
      variant: "danger",
      onConfirm: () => handleDelete(id, code),
    });
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const action = currentStatus ? "deactivate" : "activate";
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

    try {
      const response = await fetch(`/api/admin/campsites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} campsite`);
      }

      // Optimistically update the UI
      setCampsites((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
      );

      showToast(`Campsite ${action}d successfully`, "success");
    } catch (err) {
      console.error(`Error ${action}ing campsite:`, err);
      showToast(
        err instanceof Error ? err.message : `Failed to ${action} campsite`,
        "error"
      );
    }
  }

  async function handleDelete(id: string, code: string) {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    try {
      setIsDeleting(id);
      const response = await fetch(`/api/admin/campsites/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete campsite");
      }

      setCampsites((prev) => prev.filter((c) => c.id !== id));
      showToast("Campsite deleted permanently", "success");
    } catch (err) {
      console.error("Error deleting campsite:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to delete campsite",
        "error"
      );
    } finally {
      setIsDeleting(null);
    }
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredCampsites = useMemo(() => {
    return filter === "all"
      ? campsites
      : filter === "active"
        ? campsites.filter((c) => c.is_active)
        : filter === "inactive"
          ? campsites.filter((c) => !c.is_active)
          : campsites.filter((c) => c.type === filter);
  }, [campsites, filter]);

  const toggleAllSelection = () => {
    if (selectedIds.size === filteredCampsites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCampsites.map((c) => c.id)));
    }
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const uploadRes = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      const { url } = await uploadRes.json();

      // Update campsite in DB
      const patchRes = await fetch(`/api/admin/campsites/${uploadingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!patchRes.ok) throw new Error("Failed to update campsite image");

      // Update local state
      setCampsites((prev) =>
        prev.map((c) => (c.id === uploadingId ? { ...c, image_url: url } : c))
      );
      showToast("Image uploaded successfully", "success");
    } catch (err) {
      console.error("Image upload error:", err);
      showToast("Failed to upload image", "error");
    } finally {
      setLoading(false);
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function requestRemoveImage(id: string) {
    setConfirmConfig({
      isOpen: true,
      title: "Remove Image?",
      message:
        "Are you sure you want to remove this image from the campsite gallery?",
      confirmLabel: "Remove Image",
      variant: "danger",
      onConfirm: () => handleRemoveImage(id),
    });
  }

  async function handleRemoveImage(id: string) {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/campsites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: null }),
      });

      if (!response.ok) throw new Error("Failed to remove image");

      setCampsites((prev) =>
        prev.map((c) => (c.id === id ? { ...c, image_url: null } : c))
      );
      showToast("Image removed", "success");
    } catch (err) {
      console.error("Error removing image:", err);
      showToast("Failed to remove image", "error");
    } finally {
      setLoading(false);
    }
  }

  const { typeCounts, activeCampsites, inactiveCampsites } = useMemo(() => {
    const counts = campsites.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<CampsiteType, number>);

    return {
      typeCounts: counts,
      activeCampsites: campsites.filter((c) => c.is_active).length,
      inactiveCampsites: campsites.filter((c) => !c.is_active).length,
    };
  }, [campsites]);

  return {
    // State
    campsites,
    loading,
    error,
    filter,
    setFilter,
    isDeleting,
    uploadingId,
    setUploadingId,
    selectedIds,
    setSelectedIds,
    confirmConfig,
    setConfirmConfig,
    fileInputRef,

    // Computed
    filteredCampsites,
    typeCounts,
    activeCampsites,
    inactiveCampsites,

    // Actions
    requestToggleActive,
    requestDelete,
    toggleSelection,
    toggleAllSelection,
    handleImageUpload,
    requestRemoveImage,
  };
}
