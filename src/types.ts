export interface SenderDetails {
  fullName: string;
  firstName?: string;
  lastName?: string;
  completeAddress: string;
  country?: string;
  emirates?: string;
  city?: string;
  district?: string;
  zone?: string;
  addressLine1?: string;
  landmark?: string;
  dialCode?: string;
  phoneNumber?: string;
  contactNo: string;
  emailAddress: string;
  agentName?: string;
  deliveryOption?: 'warehouse' | 'pickup';
}

export interface ReceiverDetails {
  fullName: string;
  firstName?: string;
  lastName?: string;
  completeAddress: string;
  country?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  addressLine1?: string;
  landmark?: string;
  dialCode?: string;
  phoneNumber?: string;
  contactNo: string;
  emailAddress: string;
  deliveryOption: 'pickup' | 'delivery';
}

export interface AdditionalDetails {
  paymentMethod: 'cash' | 'bank';
  email?: string;
  additionalInstructions?: string;
}

export interface ItemDeclaration {
  id: string;
  commodity: string;
  qty: number;
}

export interface BookingFormData {
  service?: string;
  sender: SenderDetails;
  receiver: ReceiverDetails;
  items: ItemDeclaration[];
  additionalDetails?: AdditionalDetails;
}

export interface VerificationData {
  eidFrontImage?: string;
  eidBackImage?: string;
  faceImage?: string; // Keep for backward compatibility (will use first image)
  faceImages?: string[]; // Array to store multiple face images
  eidVerified: boolean;
  faceVerified: boolean;
}

export interface BookingData extends BookingFormData {
  verification: VerificationData;
  termsAccepted: boolean;
  submissionTimestamp?: string;
}

export type Step = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

