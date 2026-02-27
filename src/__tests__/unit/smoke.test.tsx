import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

/**
 * Smoke test — verifies that Vitest + React Testing Library
 * are configured correctly and can render a React component.
 */
describe("Test Setup", () => {
    it("renders a React component", () => {
        render(<div data-testid="smoke">Hello Vitest</div>);
        expect(screen.getByTestId("smoke")).toBeInTheDocument();
        expect(screen.getByTestId("smoke")).toHaveTextContent("Hello Vitest");
    });

    it("basic assertions work", () => {
        expect(1 + 1).toBe(2);
        expect("soliton").toContain("sol");
    });
});
