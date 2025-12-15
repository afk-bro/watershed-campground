"use client";

import { useState } from "react";
import DateStep from "./steps/DateStep";
import CampsiteParamsStep from "./steps/CampsiteParamsStep";
import ResultsStep from "./steps/ResultsStep";
import ReservationSummary from "./ReservationSummary";

interface BookingWizardProps {
    onComplete: (data: any) => void;
}

export default function BookingWizard({ onComplete }: BookingWizardProps) {
    const [step, setStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        checkIn: null as string | null,
        checkOut: null as string | null,
        guests: 2,
        unitType: '',
        rvLength: 0,
        selectedSite: null as any
    });

    const next = () => setStep(s => s + 1);
    const back = () => setStep(s => s - 1);
    const goToStep = (stepNum: number) => setStep(stepNum);

    const handleDateSelection = (start: string, end: string) => {
        setBookingData(prev => ({ ...prev, checkIn: start, checkOut: end }));
        next();
    };

    const handleSelectSite = (site: any) => {
        const finalData = { ...bookingData, selectedSite: site };
        setBookingData(finalData);
        onComplete(finalData);
    };

    return (
        <div className="max-w-4xl mx-auto min-h-[600px]">
            {/* Progress Bar */}
            <div className="flex items-center justify-between mb-8 px-4 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[var(--color-border-subtle)] -z-10"></div>
                
                {[1, 2, 3].map(i => (
                    <div key={i} className={`flex flex-col items-center gap-2 bg-[var(--color-background)] px-2 ${step >= i ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)]'}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                             step >= i 
                             ? 'bg-[var(--color-brand-forest)] border-[var(--color-accent-gold)]' 
                             : 'bg-[var(--color-surface-elevated)] border-[var(--color-border-subtle)]'
                         }`}>
                             {step > i ? '✓' : i}
                         </div>
                         <span className="text-xs font-medium hidden sm:block">
                             {i === 1 ? 'Dates' : i === 2 ? 'Details' : 'Select Site'}
                         </span>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {step === 1 && (
                    <DateStep
                        checkIn={bookingData.checkIn}
                        checkOut={bookingData.checkOut}
                        onSelectRange={handleDateSelection}
                    />
                )}
                {step === 2 && (
                    <>
                        <ReservationSummary
                            checkIn={bookingData.checkIn}
                            checkOut={bookingData.checkOut}
                            guests={bookingData.guests}
                            unitType={bookingData.unitType}
                            currentStep={step}
                            totalSteps={3}
                            onChangeDates={() => goToStep(1)}
                        />
                        <CampsiteParamsStep
                            formData={bookingData}
                            onChange={(data) => setBookingData(prev => ({...prev, ...data}))}
                            onNext={next}
                        />
                    </>
                )}
                {step === 3 && (
                    <>
                        <ReservationSummary
                            checkIn={bookingData.checkIn}
                            checkOut={bookingData.checkOut}
                            guests={bookingData.guests}
                            unitType={bookingData.unitType}
                            currentStep={step}
                            totalSteps={3}
                            onChangeDates={() => goToStep(1)}
                            onChangeDetails={() => goToStep(2)}
                        />
                        <ResultsStep
                            searchParams={bookingData}
                            onSelectSite={handleSelectSite}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
