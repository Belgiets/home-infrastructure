/**
 * Tests for API client
 *
 * What we test:
 * 1. Successful requests return data
 * 2. API errors throw ApiError
 * 3. On 401, refresh is attempted
 * 4. If refresh succeeds, request is retried
 * 5. If refresh fails, redirect to login
 */

import { api, ApiError } from "../api";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location for redirect testing
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("API Client", () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    mockLocation.href = "";
  });

  describe("api.auth.login", () => {
    it("should return success message on successful login", async () => {
      // Arrange: setup mock for successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Login successful" }),
      });

      // Act: call the function
      const result = await api.auth.login({
        email: "test@example.com",
        password: "password123",
      });

      // Assert: verify result
      expect(result).toEqual({ message: "Login successful" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/auth/login",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should throw ApiError on failed login", async () => {
      // Arrange: setup mock for error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid credentials" }),
      });

      // Act & Assert: verify error is thrown with correct properties
      try {
        await api.auth.login({ email: "test@example.com", password: "wrong" });
        fail("Expected ApiError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
        expect((error as ApiError).message).toBe("Invalid credentials");
      }
    });
  });

  describe("api.auth.register", () => {
    it("should return success message on successful registration", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Registration successful" }),
      });

      const result = await api.auth.register({
        email: "new@example.com",
        password: "password123",
        name: "John",
      });

      expect(result).toEqual({ message: "Registration successful" });
    });

    it("should throw ApiError if email already exists", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: "User with this email already exists" }),
      });

      await expect(
        api.auth.register({ email: "existing@example.com", password: "pass" })
      ).rejects.toMatchObject({
        status: 409,
        message: "User with this email already exists",
      });
    });
  });

  describe("api.auth.me", () => {
    it("should return user data when authenticated", async () => {
      const userData = { id: "123", email: "test@example.com", name: "John" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => userData,
      });

      const result = await api.auth.me();

      expect(result).toEqual(userData);
    });

    it("should attempt refresh on 401 and retry request", async () => {
      const userData = { id: "123", email: "test@example.com" };

      // First call to /auth/me returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      // Call to /auth/refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Tokens refreshed" }),
      });

      // Retry call to /auth/me succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => userData,
      });

      const result = await api.auth.me();

      expect(result).toEqual(userData);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should redirect to login if refresh fails", async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Unauthorized" }),
      });

      // Refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid refresh token" }),
      });

      await expect(api.auth.me()).rejects.toThrow("Session expired");
      expect(mockLocation.href).toBe("/login");
    });
  });

  describe("api.auth.logout", () => {
    it("should return success message on logout", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Logged out successfully" }),
      });

      const result = await api.auth.logout();

      expect(result).toEqual({ message: "Logged out successfully" });
    });
  });

  describe("ApiError", () => {
    it("should have correct properties", () => {
      const error = new ApiError(404, "Not found");

      expect(error).toBeInstanceOf(Error);
      expect(error.status).toBe(404);
      expect(error.message).toBe("Not found");
      expect(error.name).toBe("ApiError");
    });
  });
});
