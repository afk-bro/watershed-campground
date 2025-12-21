export type Addon = {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    image_url?: string;
};

export type PolicyType = 'deposit' | 'full';

export type PaymentBreakdown = {
    totalAmount: number;
    dueNow: number;
    dueLater: number;
    depositAmount: number;
    remainderDueAt: string | null;
    siteTotal: number;
    addonsTotal: number;
    policyApplied?: {
        name: string;
        description?: string;
        policy_type: PolicyType;
    };
};

export type ContactMethod = 'Phone' | 'Email' | 'Either' | '';

export type FormData = {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    postalCode: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    rvLength: string;
    rvYear: string;
    adults: string;
    children: string;
    campingUnit: string;
    hearAbout: string;
    contactMethod: ContactMethod;
    comments: string;
    campsiteId: string;
};

export type PaymentMethod = 'full' | 'deposit' | 'in-person';
