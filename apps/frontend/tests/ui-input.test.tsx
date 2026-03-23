import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Input } from "@repo/ui/input"

describe("Input component", () => {
  it("renders placeholder and applies default class", () => {
    render(<Input placeholder="Correo" />)

    const input = screen.getByPlaceholderText("Correo")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("data-slot", "input")
  })
})
