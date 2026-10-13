import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";

const PROFILE_KEY = "ambianceur.profile";

beforeEach(() => {
  localStorage.clear();
  window.history.pushState(null, "", "/");
});

describe("accueil et profil", () => {
  it("au premier lancement, demande seulement un pseudo (pas de compte)", () => {
    render(<App />);
    expect(screen.getByLabelText("Ton pseudo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /avatar .*toucher pour changer/i })).toBeInTheDocument();
    expect(screen.queryByText(/connexion|inscription|mot de passe|e-?mail/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer une partie" })).not.toBeInTheDocument();
  });

  it("refuse un pseudo vide ou trop long", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Ton pseudo"), "   ");
    await user.click(screen.getByRole("button", { name: "C'est parti" }));
    expect(screen.getByRole("alert")).toHaveTextContent("entre 1 et 20 caractères");

    await user.clear(screen.getByLabelText("Ton pseudo"));
    await user.type(screen.getByLabelText("Ton pseudo"), "a".repeat(21));
    await user.click(screen.getByRole("button", { name: "C'est parti" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
  });

  it("mémorise le profil et le pré-remplit au lancement suivant", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole("button", { name: /avatar/i }));
    await user.click(screen.getByRole("option", { name: "🐙" }));
    await user.type(screen.getByLabelText("Ton pseudo"), "  Paulo  ");
    await user.click(screen.getByRole("button", { name: "C'est parti" }));

    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY)!);
    expect(stored).toMatchObject({ pseudo: "Paulo", avatar: "🐙" });
    expect(stored.deviceId).toMatch(/^[0-9a-f-]{36}$/);

    // « Rechargement » de l'application
    first.unmount();
    render(<App />);
    expect(screen.getByText("Paulo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer une partie" })).toBeInTheDocument();
    expect(screen.getByLabelText("Code de la partie")).toBeInTheDocument();
  });

  it("modifie le profil sans changer l'identifiant d'appareil", async () => {
    const user = userEvent.setup();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ deviceId: "11111111-2222-4333-8444-555555555555", pseudo: "Léa", avatar: "🦊" }));
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Modifier" }));
    const input = screen.getByLabelText("Ton pseudo");
    expect(input).toHaveValue("Léa");
    await user.clear(input);
    await user.type(input, "Léa la Grande");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText("Léa la Grande")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!)).toEqual({
      deviceId: "11111111-2222-4333-8444-555555555555",
      pseudo: "Léa la Grande",
      avatar: "🦊",
    });
  });

  it("met le code saisi en majuscules et n'accepte que 4 lettres", async () => {
    const user = userEvent.setup();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ deviceId: "11111111-2222-4333-8444-555555555555", pseudo: "Léa", avatar: "🦊" }));
    render(<App />);
    const code = screen.getByLabelText("Code de la partie");
    await user.type(code, "ab1cde");
    expect(code).toHaveValue("ABCD");
  });

  it("sur un lien de salle sans profil, demande le pseudo avant de rejoindre", () => {
    window.history.pushState(null, "", "/r/ABCD");
    render(<App />);
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejoindre la partie" })).toBeInTheDocument();
  });
});
