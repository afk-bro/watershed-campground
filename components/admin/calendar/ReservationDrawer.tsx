
import { Reservation } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { X, Calendar, User, Mail, Phone, MapPin, Tent, CreditCard } from "lucide-react";
import Link from "next/link";

interface ReservationDrawerProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationDrawer({
  reservation,
  isOpen,
  onClose,
}: ReservationDrawerProps) {
  if (!reservation) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-surface-card)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-brand-forest text-white">
            <div>
              <h2 className="text-xl font-heading font-bold">
                {reservation.first_name} {reservation.last_name}
              </h2>
              <p className="text-brand-beige text-sm opacity-90">
                Res #{reservation.id?.slice(0, 8)} • <span className="uppercase">{reservation.status}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-surface"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Dates & Site */}
            <div className="flex gap-4">
              <div className="flex-1 bg-[var(--color-surface-elevated)] p-4 rounded-lg border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-1">
                  <Calendar size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Dates</span>
                </div>
                <div className="font-medium text-[var(--color-text-inverse)]">
                  {format(parseISO(reservation.check_in), "MMM d")} - {format(parseISO(reservation.check_out), "MMM d, yyyy")}
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">
                  {/* Calculate nights if needed */}
                </div>
              </div>

              <div className="flex-1 bg-[var(--color-surface-elevated)] p-4 rounded-lg border border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-muted)] mb-1">
                  <Tent size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Campsite</span>
                </div>
                <div className="font-medium text-[var(--color-text-inverse)]">
                  {reservation.campsites?.name || "Unassigned"}
                </div>
                <div className="text-sm text-[var(--color-text-muted)] mt-1">
                  {reservation.campsites?.code} • {reservation.campsites?.type}
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-inverse)] uppercase tracking-wider mb-4 border-b pb-2">
                Guest Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 text-[var(--color-text-muted)]" size={18} />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-inverse)]">Email</div>
                    <a href={`mailto:${reservation.email}`} className="text-[var(--color-status-active)] hover:underline">
                      {reservation.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 text-[var(--color-text-muted)]" size={18} />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-inverse)]">Phone</div>
                    <a href={`tel:${reservation.phone}`} className="text-[var(--color-status-active)] hover:underline">
                      {reservation.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 text-[var(--color-text-muted)]" size={18} />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-inverse)]">Address</div>
                    <div className="text-[var(--color-text-muted)]">
                      {reservation.address1}
                      {reservation.address2 && <>, {reservation.address2}</>}
                      <br />
                      {reservation.city}, {reservation.postal_code}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 text-[var(--color-text-muted)]" size={18} />
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-inverse)]">Party Size</div>
                    <div className="text-[var(--color-text-muted)]">
                      {reservation.adults} Adults, {reservation.children} Children
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-inverse)] uppercase tracking-wider mb-4 border-b pb-2">
                Equipment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Unit Type</div>
                  <div className="font-medium capitalize">{reservation.camping_unit}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-muted)]">Length</div>
                  <div className="font-medium">{reservation.rv_length} ft</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t mt-auto">
              <Link
                href={`/admin/reservations/${reservation.id}`}
                className="block w-full text-center bg-[var(--color-surface-primary)] text-white py-3 rounded-lg font-medium hover:bg-[var(--color-surface-secondary)] transition-surface"
              >
                Full Edit Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
