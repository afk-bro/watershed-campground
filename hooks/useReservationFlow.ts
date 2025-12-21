"use client";

import { useState, useEffect, useCallback } from "react";
import { Addon, PaymentBreakdown, PaymentMethod, FormData } from "@/lib/booking/booking-types";

interface UseReservationFlowProps {
    initialStep?: 1 | 2 | 3 | 4;
}

export function useReservationFlow({ initialStep = 1 }: UseReservationFlowProps = {}) {
    const [view, setView] = useState<'wizard' | 'form'>('wizard');
    const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);

    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        address1: "",
        address2: "",
        city: "",
        postalCode: "",
        email: "",
        phone: "",
        checkIn: "",
        checkOut: "",
        rvLength: "",
        rvYear: "",
        adults: "",
        children: "",
        campingUnit: "",
        hearAbout: "",
        contactMethod: "",
        comments: "",
        campsiteId: "",
    });

    const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

    const [clientSecret, setClientSecret] = useState("");
    const [breakdown, setBreakdown] = useState<PaymentBreakdown | null>(null);
    const [isInitializingPayment, setIsInitializingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full');
    const [depositAmount, setDepositAmount] = useState<string>('');

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Fetch addons on mount
    useEffect(() => {
        fetch('/api/addons')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableAddons(data);
            })
            .catch(err => console.error("Failed to load addons", err));
    }, []);

    const handleWizardComplete = (data: any) => {
        setFormData(prev => ({
            ...prev,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            adults: data.guests,
            rvLength: data.rvLength?.toString() || "",
            campingUnit: data.unitType,
            campsiteId: data.selectedSite?.id || ""
        }));
        setView('form');
        // We assume the wizard handles its own scroll or the page will handle scroll on view change
    };

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));

        // Clear field errors for updated fields
        const updatedKeys = Object.keys(updates);
        if (updatedKeys.some(k => fieldErrors[k])) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                updatedKeys.forEach(k => delete newErrors[k]);
                return newErrors;
            });
        }
    };

    const toggleAddon = (id: string, qty: number) => {
        setSelectedAddons(prev => ({ ...prev, [id]: qty }));
    };

    const validatePersonalInfo = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.firstName.trim()) errors.firstName = "First name is required";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required";
        if (!formData.address1.trim()) errors.address1 = "Address is required";
        if (!formData.city.trim()) errors.city = "City is required";
        if (!formData.postalCode.trim()) errors.postalCode = "Postal code is required";

        if (!formData.phone.trim()) {
            errors.phone = "Phone number is required";
        } else if (!/^[\d\s\(\)\-\+]+$/.test(formData.phone)) {
            errors.phone = "Please enter a valid phone number";
        }

        if (!formData.email.trim()) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (!formData.contactMethod) {
            errors.contactMethod = "Please select your preferred contact method";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const proceedToAddons = () => {
        if (!validatePersonalInfo()) return false;
        setStep(2);
        return true;
    };

    const initializePayment = async () => {
        setIsInitializingPayment(true);
        setErrorMessage("");

        try {
            if (paymentMethod === 'in-person') {
                // Logic handled by submitReservation for 'in-person' usually, 
                // but consistent with current flow we might want to just proceed to confirmation?
                // In original code, handleAddonsSubmit calls handlePayInPersonReservation OR create-payment-intent
                // We will separate these.
                // If in-person, we can just return/proceed. 
                // But the original code skips step 3 for in-person? No, check original code.
                // Original: if (paymentMethod === 'in-person') { await handlePayInPersonReservation(); return; }
                // handlePayInPersonReservation -> sends /api/reservation, sets step 4.
                // So for in-person, we don't go to step 3 (Review & Pay with Stripe).
                return { skipToStep4: true };
            }

            const addonsPayload = Object.entries(selectedAddons)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => {
                    const addon = availableAddons.find(a => a.id === id);
                    return { id, quantity: qty, price: addon?.price || 0 };
                });

            let customDepositAmount: number | undefined;
            if (paymentMethod === 'deposit') {
                const amount = parseFloat(depositAmount);
                if (isNaN(amount) || amount < 10) {
                    throw new Error("Deposit amount must be at least $10");
                }
                customDepositAmount = amount;
            }

            const res = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    checkIn: formData.checkIn,
                    checkOut: formData.checkOut,
                    adults: Number(formData.adults),
                    children: Number(formData.children),
                    addons: addonsPayload,
                    campsiteId: formData.campsiteId,
                    paymentMethod: paymentMethod,
                    customDepositAmount: customDepositAmount
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to initialize reservation");

            setClientSecret(data.clientSecret);
            setBreakdown(data.breakdown);
            setStep(3);
            return { skipToStep4: false };

        } catch (err) {
            console.error("Payment Init Error:", err);
            setErrorMessage(err instanceof Error ? err.message : "Failed to calculate costs.");
            return { error: err };
        } finally {
            setIsInitializingPayment(false);
        }
    };

    const submitReservation = async (paymentIntentId?: string) => {
        setStatus("loading");
        try {
            const addonsPayload = Object.entries(selectedAddons)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => {
                    const addon = availableAddons.find(a => a.id === id);
                    return { id, quantity: qty, price: addon?.price || 0 };
                });

            const response = await fetch("/api/reservation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    addons: addonsPayload,
                    paymentMethod: paymentMethod === 'in-person' ? 'in-person' : undefined,
                    paymentIntentId
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Reservation failed");

            setStep(4);
            setStatus("success");
            return data;
        } catch (error) {
            console.error("Reservation Error:", error);
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Failed to create reservation");
            return null;
        }
    };

    return {
        view,
        setView,
        step,
        setStep,
        formData,
        updateFormData,
        availableAddons,
        selectedAddons,
        toggleAddon,
        paymentMethod,
        setPaymentMethod,
        depositAmount,
        setDepositAmount,
        clientSecret,
        breakdown,
        isInitializingPayment,
        status,
        errorMessage,
        fieldErrors,
        handleWizardComplete,
        validatePersonalInfo,
        proceedToAddons,
        initializePayment,
        submitReservation
    };
}
