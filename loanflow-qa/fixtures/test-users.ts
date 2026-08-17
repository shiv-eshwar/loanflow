export type TestUser = {
  email: string;
  password: string;
};

export const qaUser: TestUser = {
  email: "qa@loanflow.test",
  password: "Password123!",
};

export const otherUser: TestUser = {
  email: "other@loanflow.test",
  password: "Password123!",
};

export const invalidPassword = "WrongPassword!";
