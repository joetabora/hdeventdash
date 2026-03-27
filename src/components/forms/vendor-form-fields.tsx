"use client";

import { Input, Textarea } from "@/components/ui/input";
import type { Vendor } from "@/types/database";

export type VendorFormValues = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  category: string;
  notes: string;
};

export const EMPTY_VENDOR_FORM_VALUES: VendorFormValues = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  category: "",
  notes: "",
};

export function vendorFormValuesFromVendor(v: Vendor): VendorFormValues {
  return {
    name: v.name,
    contact_name: v.contact_name,
    email: v.email,
    phone: v.phone,
    website: v.website,
    category: v.category,
    notes: v.notes,
  };
}

/** Payload for POST /api/vendors and PATCH /api/vendors/[id]. */
export function vendorFormValuesToPayload(values: VendorFormValues) {
  return {
    name: values.name.trim(),
    contact_name: values.contact_name,
    email: values.email,
    phone: values.phone,
    website: values.website,
    category: values.category,
    notes: values.notes,
  };
}

type VendorFormFieldsProps = {
  values: VendorFormValues;
  onChange: (field: keyof VendorFormValues, value: string) => void;
};

export function VendorFormFields({ values, onChange }: VendorFormFieldsProps) {
  const set =
    (field: keyof VendorFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, e.target.value);
    };

  return (
    <div className="space-y-4">
      <Input
        label="Name *"
        value={values.name}
        onChange={set("name")}
        required
        placeholder="Company or vendor name"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Category"
          value={values.category}
          onChange={set("category")}
          placeholder="e.g. Catering, AV, sponsor"
        />
        <Input
          label="Contact name"
          value={values.contact_name}
          onChange={set("contact_name")}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={values.email}
          onChange={set("email")}
        />
        <Input
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={set("phone")}
        />
      </div>
      <Input
        label="Website"
        value={values.website}
        onChange={set("website")}
        placeholder="https://"
      />
      <Textarea
        label="Internal notes"
        value={values.notes}
        onChange={set("notes")}
      />
    </div>
  );
}
