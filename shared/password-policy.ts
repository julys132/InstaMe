export type PasswordRequirementCheck = {
  id: "length" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  passed: boolean;
  messageFragment: string;
};

function hasUppercaseCharacter(password: string): boolean {
  return /[A-Z]/.test(password);
}

function hasLowercaseCharacter(password: string): boolean {
  return /[a-z]/.test(password);
}

function hasNumberCharacter(password: string): boolean {
  return /\d/.test(password);
}

function hasSpecialCharacter(password: string): boolean {
  return /[^A-Za-z0-9]/.test(password);
}

export function getPasswordRequirementChecks(password: string): PasswordRequirementCheck[] {
  return [
    {
      id: "length",
      label: "8+ characters",
      passed: password.length >= 8,
      messageFragment: "at least 8 characters",
    },
    {
      id: "uppercase",
      label: "1 uppercase letter",
      passed: hasUppercaseCharacter(password),
      messageFragment: "an uppercase letter",
    },
    {
      id: "lowercase",
      label: "1 lowercase letter",
      passed: hasLowercaseCharacter(password),
      messageFragment: "a lowercase letter",
    },
    {
      id: "number",
      label: "1 number",
      passed: hasNumberCharacter(password),
      messageFragment: "a number",
    },
    {
      id: "special",
      label: "1 special character",
      passed: hasSpecialCharacter(password),
      messageFragment: "a special character",
    },
  ];
}

export function isStrongPassword(password: string): boolean {
  return getPasswordRequirementChecks(password).every((requirement) => requirement.passed);
}

function formatRequirementList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function getPasswordValidationMessage(password: string): string | null {
  const missingParts = getPasswordRequirementChecks(password)
    .filter((requirement) => !requirement.passed)
    .map((requirement) => requirement.messageFragment);

  if (missingParts.length === 0) {
    return null;
  }

  return `Password must include ${formatRequirementList(missingParts)}.`;
}