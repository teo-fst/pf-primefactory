import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import enMessages from "../../messages/en.json";
import itMessages from "../../messages/it.json";
import { routing } from "@/i18n/routing";

function Titolo() {
  // Piccolo componente di prova: mostra il titolo tradotto.
  return <h1>{itMessages.Home.title}</h1>;
}

describe("i18n", () => {
  it("ha it come lingua predefinita e en disponibile", () => {
    expect(routing.defaultLocale).toBe("it");
    expect(routing.locales).toEqual(["it", "en"]);
  });

  it("i file messaggi hanno le stesse chiavi", () => {
    expect(Object.keys(enMessages.Home).sort()).toEqual(
      Object.keys(itMessages.Home).sort(),
    );
  });

  it("mostra il titolo Primefactory", () => {
    render(
      <NextIntlClientProvider locale="it" messages={itMessages}>
        <Titolo />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Primefactory" })).toBeInTheDocument();
  });
});
