export class CreateClientDto {
  userId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  documentId?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

export class UpdateClientDto {
  userId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  documentId?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}
