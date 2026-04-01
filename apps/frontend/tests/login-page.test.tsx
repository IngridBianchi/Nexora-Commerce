/* eslint-disable @next/next/no-img-element */

import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LoginForm } from "@/app/login/page"

const pushMock = vi.fn()
let currentParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentParams,
  Suspense: ({ children }: { children: React.ReactNode }) => children
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const imageProps = { ...props }
    delete imageProps.priority
    return <img {...imageProps} alt={imageProps.alt ?? ""} />
  }
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  )
}))

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset()
    currentParams = new URLSearchParams()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("switches between login, register and forgot modes", () => {
    render(<LoginForm />)

    expect(screen.getByRole("heading", { name: "Iniciar sesion" })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Crear una cuenta" })[0])
    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Olvide mi contrasena" })[0])
    expect(screen.getByRole("heading", { name: "Recuperar acceso" })).toBeInTheDocument()
  })

  it("shows validation error when register passwords do not match", async () => {
    currentParams = new URLSearchParams("mode=register")

    render(<LoginForm />)

    fireEvent.change(await screen.findByLabelText("Nombre"), { target: { value: "Ada Lovelace" } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } })
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "secret123" } })
    fireEvent.change(screen.getByLabelText("Confirmar contrasena"), { target: { value: "other123" } })

    fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form") as HTMLFormElement)

    expect(await screen.findByText("Las contrasenas no coinciden")).toBeInTheDocument()
  })

  it("renders reset token mode from query params", () => {
    currentParams = new URLSearchParams("mode=reset&email=ada@example.com&token=abc123")

    render(<LoginForm />)

    expect(screen.getByRole("heading", { name: "Definir nueva contrasena" })).toBeInTheDocument()
    expect(screen.getByDisplayValue("ada@example.com")).toBeInTheDocument()
    expect(screen.getByDisplayValue("abc123")).toBeInTheDocument()
  })

  it("shows email success path for forgot-password responses", async () => {
    currentParams = new URLSearchParams("mode=forgot")

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, delivery: "email" })
      })
    )

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } })
    fireEvent.submit(screen.getByRole("button", { name: "Enviar enlace" }).closest("form") as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText(/enviamos un correo con instrucciones/i)).toBeInTheDocument()
    })
  })

  it("shows demo verification link after register when email backend falls back to demo-link", async () => {
    currentParams = new URLSearchParams("mode=register")

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          delivery: "demo-link",
          verificationUrl: "/login?mode=verify&email=ada@example.com&token=abc123"
        })
      })
    )

    render(<LoginForm />)

    fireEvent.change(await screen.findByLabelText("Nombre"), { target: { value: "Ada Lovelace" } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } })
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "secret123" } })
    fireEvent.change(screen.getByLabelText("Confirmar contrasena"), { target: { value: "secret123" } })
    fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form") as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText(/verifica tu email para completar la activacion/i)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "este enlace seguro" })).toHaveAttribute(
        "href",
        "/login?mode=verify&email=ada@example.com&token=abc123"
      )
    })
  })
})