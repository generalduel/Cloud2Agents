export interface AppConfigPublic {
  projectName: string;
  projectSlug: string;
  description: string;
  keywords: string[];
  auth: {
    enablePasswordAuth?: boolean;
  };
  legal: {
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    email: string;
    phone: string;
  };
  social: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
    youtube?: string;
  };
  email: {
    senderName: string;
    senderEmail: string;
  };
}
