import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReservationSuccess from "@/components/booking/ReservationSuccess";
import { PaymentMethod, FormData } from "@/lib/booking/booking-types";
import { databaseReservationSchema } from "@/lib/reservation/validation";

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

  // Validate reservation data for integrity
  const validationResult = databaseReservationSchema.safeParse(reservation);
  if (!validationResult.success) {
    console.error(`Data validation failed for reservation ${id}:`);
    console.error('Validation errors:', JSON.stringify(validationResult.error.issues, null, 2));
    console.error('Raw reservation data:', JSON.stringify(reservation, null, 2));
    return (
      <main>
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="font-heading text-3xl text-accent-gold mb-4">Data Integrity Error</h1>
            <p className="text-accent-beige/90 mb-6">
              We found an issue with your reservation data. Please contact us for assistance.
            </p>
            <div className="bg-brand-forest/60 border border-accent-gold/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-accent-beige/70">
                Reservation ID: <span className="font-mono text-accent-gold">{id}</span>
              </p>
            </div>
            <Link
              href="/"
              className="inline-block bg-accent-gold hover:bg-accent-gold-dark text-brand-forest font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const validatedReservation = validationResult.data;

  // Map validated database fields to frontend FormData shape
  const formData: FormData = {
    firstName: validatedReservation.first_name,
    lastName: validatedReservation.last_name,
    email: validatedReservation.email,
    phone: validatedReservation.phone,
    address1: validatedReservation.address1,
    address2: validatedReservation.address2 || "",
    city: validatedReservation.city,
    postalCode: validatedReservation.postal_code,
    checkIn: validatedReservation.check_in,
    checkOut: validatedReservation.check_out,
    adults: validatedReservation.adults.toString(),
    children: validatedReservation.children.toString(),
    rvLength: validatedReservation.rv_length || "0",
    rvYear: validatedReservation.rv_year || "",
    campingUnit: validatedReservation.camping_unit,
    hearAbout: validatedReservation.hear_about || "",
    contactMethod: validatedReservation.contact_method,
    comments: validatedReservation.comments || "",
    campsiteId: validatedReservation.campsite_id || "",
  };

  // Map payment status to payment method for display logic
  let paymentMethod: PaymentMethod = "full";
  if (validatedReservation.payment_status === "deposit_paid") {
    paymentMethod = "deposit";
  } else if (validatedReservation.payment_status === "pay_on_arrival") {
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
