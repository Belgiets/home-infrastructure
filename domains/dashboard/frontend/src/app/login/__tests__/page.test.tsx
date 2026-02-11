/**
 * Tests for Login Page
 *
 * What we test:
 * 1. Form rendering
 * 2. Field validation
 * 3. Form submission
 * 4. Error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";
import { api } from "@/lib/api";

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock api
jest.mock("@/lib/api", () => ({
  api: {
    auth: {
      login: jest.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render login form with all fields", () => {
      render(<LoginPage />);

      // Verify heading is present
      expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();

      // Verify fields are present
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Verify button is present
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();

      // Verify registration link
      expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute(
        "href",
        "/register"
      );
    });

    it("should show success message after registration", () => {
      // Simulate ?registered=true parameter
      mockSearchParams.set("registered", "true");

      render(<LoginPage />);

      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();

      // Clean up parameter
      mockSearchParams.delete("registered");
    });
  });

  describe("Form Validation", () => {
    it("should require email and password fields", async () => {
      render(<LoginPage />);

      // HTML5 validation will block submit
      // Verify fields have required attribute
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });
  });

  describe("Form Submission", () => {
    it("should call login API on form submit", async () => {
      const user = userEvent.setup();
      (api.auth.login as jest.Mock).mockResolvedValueOnce({
        message: "Login successful",
      });

      render(<LoginPage />);

      // Fill in the form
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      // Verify API call
      await waitFor(() => {
        expect(api.auth.login).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });

      // Verify redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();

      // Delay API response
      (api.auth.login as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      // Verify button shows loading state
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });

    it("should display error message on login failure", async () => {
      const user = userEvent.setup();
      const { ApiError } = jest.requireMock("@/lib/api");

      (api.auth.login as jest.Mock).mockRejectedValueOnce(
        new ApiError(401, "Invalid email or password")
      );

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Verify redirect did NOT happen
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
