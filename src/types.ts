export interface SenderDetails {
  fullName: string;
  completeAddress: string;
  contactNo: string;
  emailAddress: string;
  agentName?: string;
}

export interface ReceiverDetails {
  fullName: string;
  completeAddress: string;
  contactNo: string;
  emailAddress: string;
  deliveryOption: 'warehouse' | 'address';
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

export type Step = 0 | 1 | 2 | 3 | 4;

