import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import ReservationSuccess from "@/components/booking/ReservationSuccess";
import { PaymentMethod, FormData, ContactMethod } from "@/lib/booking/booking-types";

// Admin client to fetch reservation details (bypassing RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const { id } = await searchParams;

  if (!id) {
    return notFound();
  }

  const { data: reservation, error } = await supabaseAdmin
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !reservation) {
    console.error(`Confirmation fetch error for ID ${id}:`, error);
    return notFound();
  }

  // Map Database fields to Frontend FormData shape
  const formData: FormData = {
    firstName: reservation.first_name,
    lastName: reservation.last_name,
    email: reservation.email,
    phone: reservation.phone,
    address1: reservation.address1,
    address2: reservation.address2 || "",
    city: reservation.city,
    postalCode: reservation.postal_code,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    adults: reservation.adults.toString(),
    children: reservation.children.toString(),
    rvLength: reservation.rv_length || "",
    rvYear: reservation.rv_year || "",
    campingUnit: reservation.camping_unit,
    hearAbout: reservation.hear_about || "",
    contactMethod: (reservation.contact_method as ContactMethod) || "",
    comments: reservation.comments || "",
    campsiteId: reservation.campsite_id || "",
  };

  // Map Payment Status to Payment Method for display logic
  let paymentMethod: PaymentMethod = "full";
  if (reservation.payment_status === "deposit_paid") {
    paymentMethod = "deposit";
  } else if (reservation.payment_status === "pay_on_arrival") {
    paymentMethod = "in-person";
  }

  return (
    <main>
      <div className="py-12">
        <ReservationSuccess formData={formData} paymentMethod={paymentMethod} />
      </div>
    </main>
  );
}
