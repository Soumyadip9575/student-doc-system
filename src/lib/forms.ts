export type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "date" | "textarea";
  required: boolean;
};