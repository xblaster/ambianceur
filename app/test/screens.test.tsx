import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicState } from "@ambianceur/shared";
import { QuestionScreen } from "../src/screens/Question";
import { RevealScreen } from "../src/screens/Reveal";
import type { RoomActions } from "../src/screens/Room";

const players = ["Paul", "Léa", "Max"].map((pseudo, i) => ({
  id: `p${i}`,
  pseudo,
  avatar: "🙂",
  isHost: i === 0,
  connected: true,
  answered: false,
  spectator: false,
}));

function baseState(patch: Partial<PublicState>): PublicState {
  return {
    code: "ABCD",
    phase: "question",
    paused: false,
    serverNow: Date.now(),
    players,
    categories: { soft: true, fun: true, perso: true, coquin: false },
    canStart: false,
    missingPlayers: 0,
    round: null,
    reveal: null,
    endDeadline: null,
    queueCount: 0,
    notice: null,
    you: { id: "p1", isHost: false, spectator: false, answer: null, pendingQuestions: 0 },
    hostQueue: null,
    ...patch,
  };
}

function actions(state: PublicState, send = jest.fn()): RoomActions {
  return { state, send, clockOffset: 0, openPropose: jest.fn(), openHelp: jest.fn() };
}

const round = (type: "vote" | "yesno") => ({
  number: 1,
  type,
  text: type === "vote" ? "Qui serait le mieux en tutu ?" : "As-tu déjà dormi dehors ?",
  fromPlayer: true,
  participantIds: ["p0", "p1", "p2"],
  answeredCount: 2,
  participantCount: 3,
  deadline: Date.now() + 20_000,
});

describe("écran question", () => {
  it("affiche la grille de vote, envoie la réponse et la progression sans contenu", async () => {
    const user = userEvent.setup();
    const send = jest.fn();
    render(<QuestionScreen {...actions(baseState({ round: round("vote") }), send)} />);
    expect(screen.getByText("Qui serait le mieux en tutu ?")).toBeInTheDocument();
    expect(screen.getByText("Question d'un joueur")).toBeInTheDocument();
    expect(screen.getByText("2/3 ont répondu")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: /Max/ }));
    expect(send).toHaveBeenCalledWith({ type: "answer", answer: { kind: "vote", playerId: "p2" } });
    expect(screen.queryByRole("group", { name: "Contrôles de l'hôte" })).not.toBeInTheDocument();
  });

  it("affiche deux gros boutons Oui / Non", async () => {
    const user = userEvent.setup();
    const send = jest.fn();
    render(<QuestionScreen {...actions(baseState({ round: round("yesno") }), send)} />);
    await user.click(screen.getByRole("radio", { name: "Non" }));
    expect(send).toHaveBeenCalledWith({ type: "answer", answer: { kind: "yesno", yes: false } });
  });

  it("montre le mode spectateur à un joueur arrivé en cours de manche", () => {
    const state = baseState({ round: round("vote"), you: { id: "p9", isHost: false, spectator: true, answer: null, pendingQuestions: 0 } });
    render(<QuestionScreen {...actions(state)} />);
    expect(screen.getByText(/Tu joues à la prochaine/)).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("donne à l'hôte les contrôles Révéler, Passer, Pause et Arrêter", async () => {
    const user = userEvent.setup();
    const send = jest.fn();
    const state = baseState({ round: round("vote"), you: { id: "p0", isHost: true, spectator: false, answer: null, pendingQuestions: 0 } });
    render(<QuestionScreen {...actions(state, send)} />);
    await user.click(screen.getByRole("button", { name: "Révéler" }));
    await user.click(screen.getByRole("button", { name: "Passer" }));
    await user.click(screen.getByRole("button", { name: /Pause/ }));
    expect(send.mock.calls.map((c) => c[0].type)).toEqual(["forceReveal", "skip", "pause"]);
  });
});

describe("écran révélation", () => {
  const reveal = (result: NonNullable<PublicState["reveal"]>["result"], deadline: number | null = Date.now() + 8_000) =>
    baseState({
      phase: "reveal",
      reveal: { number: 1, type: result.kind === "yesno" ? "yesno" : "vote", text: "La question ?", fromPlayer: false, result, deadline },
    });

  it("affiche uniquement le décompte pour un oui/non", () => {
    render(<RevealScreen {...actions(reveal({ kind: "yesno", yes: 3, total: 7, noAnswer: 0 }))} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("personnes")).toBeInTheDocument();
    expect(screen.getByText(/sur 7 ont répondu/)).toBeInTheDocument();
    expect(screen.queryByText("Paul")).not.toBeInTheDocument();
  });

  it("met en avant les ex aequo d'un vote", () => {
    const result = {
      kind: "vote" as const,
      ranking: [
        { playerId: "p0", pseudo: "Paul", avatar: "🦊", votes: 2 },
        { playerId: "p1", pseudo: "Léa", avatar: "🐼", votes: 2 },
        { playerId: "p2", pseudo: "Max", avatar: "🐸", votes: 1 },
      ],
      winnerIds: ["p0", "p1"],
      total: 5,
      noAnswer: 1,
    };
    render(<RevealScreen {...actions(reveal(result))} />);
    expect(screen.getByText("Ex aequo !")).toBeInTheDocument();
    expect(screen.getAllByText("2 voix")).toHaveLength(2);
    expect(screen.getByText("1 sans réponse")).toBeInTheDocument();
  });

  it("explique quand il n'y a pas assez de réponses, et affiche la pause", () => {
    render(<RevealScreen {...actions(reveal({ kind: "insufficient", total: 2 }, null))} />);
    expect(screen.getByText(/Pas assez de réponses/)).toBeInTheDocument();
    expect(screen.getByText(/En pause/)).toBeInTheDocument();
  });
});
