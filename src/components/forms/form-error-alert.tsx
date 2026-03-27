"use client";

export function FormErrorAlert({ message }: { message: string }) {
  if (!message.trim()) return null;
  return (
    <div
      className="text-harley-danger text-sm bg-harley-danger/10 rounded-lg p-3"
      role="alert"
    >
      {message}
    </div>
  );
}
