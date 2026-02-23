/**
 * Tests for Register Page
 *
 * What we test:
 * 1. Form rendering
 * 2. Field validation (password match, minimum length)
 * 3. Form submission
 * 4. Error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "./page";
import { api } from "@/lib/api";

// Mock next/navigation
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock api
jest.mock("@/lib/api", () => ({
  api: {
    auth: {
      register: jest.fn(),
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

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation to ensure previous tests don't affect current test
    (api.auth.register as jest.Mock).mockReset();
  });

  describe("Rendering", () => {
    it("should render registration form with all fields", () => {
      render(<RegisterPage />);

      // Verify heading is present
      expect(
        screen.getByRole("heading", { name: /create account/i })
      ).toBeInTheDocument();

      // Verify fields are present
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

      // Verify button is present
      expect(
        screen.getByRole("button", { name: /register/i })
      ).toBeInTheDocument();

      // Verify login link
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
        "href",
        "/login"
      );
    });
  });

  describe("Form Validation", () => {
    it("should require email, password, and confirm password fields", () => {
      render(<RegisterPage />);

      // Name is optional
      expect(screen.getByLabelText(/^name$/i)).not.toBeRequired();

      // These fields are required
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/^password$/i)).toBeRequired();
      expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
    });

    it("should show error when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "different");
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify error message
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();

      // Verify API was NOT called
      expect(api.auth.register).not.toHaveBeenCalled();
    });

    it("should show error when password is too short", async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "12345");
      await user.type(screen.getByLabelText(/confirm password/i), "12345");
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify error message
      expect(
        screen.getByText(/password must be at least 6 characters/i)
      ).toBeInTheDocument();

      // Verify API was NOT called
      expect(api.auth.register).not.toHaveBeenCalled();
    });
  });

  describe("Form Submission", () => {
    it("should call register API on valid form submit", async () => {
      const user = userEvent.setup();
      (api.auth.register as jest.Mock).mockResolvedValueOnce({
        message: "Registration successful",
      });

      render(<RegisterPage />);

      // Fill in the form
      await user.type(screen.getByLabelText(/^name$/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify API call
      await waitFor(() => {
        expect(api.auth.register).toHaveBeenCalledWith({
          name: "John Doe",
          email: "test@example.com",
          password: "password123",
        });
      });

      // Verify redirect to login with success parameter
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login?registered=true");
      });
    });

    it("should call register API without name if not provided", async () => {
      const user = userEvent.setup();
      (api.auth.register as jest.Mock).mockResolvedValueOnce({
        message: "Registration successful",
      });

      render(<RegisterPage />);

      // Fill in the form without name
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");

      // Submit the form
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify API call - name should be undefined
      await waitFor(() => {
        expect(api.auth.register).toHaveBeenCalledWith({
          name: undefined,
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should show loading state while submitting", async () => {
      // Use fake timers to prevent the promise from resolving during the test
      // This avoids dangling promises that could affect subsequent tests
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Create a promise that never resolves during the test
      (api.auth.register as jest.Mock).mockImplementationOnce(
        () => new Promise<void>(() => {})
      );

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify button shows loading state
      expect(
        screen.getByRole("button", { name: /creating account/i })
      ).toBeDisabled();

      // Restore real timers for other tests
      jest.useRealTimers();
    });

    it("should display error message on registration failure", async () => {
      const user = userEvent.setup();
      const { ApiError } = jest.requireMock("@/lib/api");

      (api.auth.register as jest.Mock).mockRejectedValueOnce(
        new ApiError(409, "User with this email already exists")
      );

      render(<RegisterPage />);

      await user.type(screen.getByLabelText(/email/i), "existing@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /register/i }));

      // Verify error is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/user with this email already exists/i)
        ).toBeInTheDocument();
      });

      // Verify redirect did NOT happen
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
