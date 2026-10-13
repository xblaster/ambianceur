import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

interface Player {
  context: BrowserContext;
  page: Page;
  /** Trames WebSocket reçues par ce joueur. */
  frames: string[];
}

async function newPlayer(browser: Browser, pseudo?: string, avatar?: string): Promise<Player> {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() => {
    // Trace les demandes de Wake Lock (écran allumé).
    const w = window as unknown as { __wakeLock: number };
    w.__wakeLock = 0;
    const fake = { request: async () => ((w.__wakeLock += 1), { release: async () => {} }) };
    Object.defineProperty(navigator, "wakeLock", { value: fake, configurable: true });
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  const frames: string[] = [];
  page.on("websocket", (ws) => ws.on("framereceived", (f) => frames.push(String(f.payload))));
  if (pseudo) {
    await page.goto("/");
    if (avatar) {
      await page.getByRole("button", { name: /avatar/i }).click();
      await page.getByRole("option", { name: avatar }).click();
    }
    await page.getByLabel("Ton pseudo").fill(pseudo);
    await page.getByRole("button", { name: "C'est parti" }).click();
    await expect(page.getByRole("button", { name: "Créer une partie" })).toBeVisible();
  }
  return { context, page, frames };
}

/** Vérifie la contrainte mobile-first : pas de défilement horizontal, cibles tactiles >= 48 px. */
async function expectMobileFriendly(page: Page) {
  const report = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const small = [...document.querySelectorAll("button, input, textarea, label.category")]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      // offsetHeight : taille de mise en page, insensible aux animations (transform)
      .map((el) => ({ el, h: (el as HTMLElement).offsetHeight }))
      .filter(({ el, h }) => (el as HTMLInputElement).type !== "checkbox" && h < 48)
      .map(({ el, h }) => `${el.tagName}:${(el.textContent ?? "").trim().slice(0, 20)}:${h}`);
    return { overflow, small };
  });
  expect(report.overflow, "défilement horizontal").toBeLessThanOrEqual(0);
  expect(report.small, "cibles tactiles < 48 px").toEqual([]);
}

const players = (page: Page) => page.locator(".player-list li");

test("partie complète à 4 téléphones : lobby, questions, révélations, contrôles de l'hôte", async ({ browser }) => {
  // --- Accueil et création ---
  const host = await newPlayer(browser, "Paul", "🦊");
  await expectMobileFriendly(host.page);
  await host.page.getByRole("button", { name: "Comment ça marche ?" }).click();
  await expect(host.page.getByRole("dialog", { name: "Comment ça marche" })).toBeVisible();
  await host.page.getByRole("button", { name: "Compris !" }).click();
  await host.page.getByRole("button", { name: "Créer une partie" }).click();
  await expect(host.page).toHaveURL(/\/r\/[A-HJ-NP-Z]{4}$/);
  const code = (await host.page.locator(".room-code").textContent())!.trim();
  expect(await host.page.evaluate(() => (window as unknown as { __wakeLock: number }).__wakeLock)).toBeGreaterThan(0);

  // --- Aide accessible depuis le lobby (et l'accueil) ---
  await host.page.getByRole("button", { name: "Comment ça marche ?" }).click();
  const help = host.page.getByRole("dialog", { name: "Comment ça marche" });
  await expect(help.getByText("Et l'anonymat ?")).toBeVisible();
  await expect(help.getByText(/Personne ne voit ta réponse, pas même l'hôte/)).toBeVisible();
  await expect(help.getByText(/si tout le monde répond pareil/)).toBeVisible();
  await expectMobileFriendly(host.page);
  await help.getByRole("button", { name: "Compris !" }).click();
  await expect(help).toHaveCount(0);

  // --- Lobby : QR, invitation ---
  await expect(host.page.getByAltText(`QR code pour rejoindre la partie ${code}`)).toBeVisible();
  await host.page.getByRole("button", { name: "Inviter" }).click();
  await expect(host.page.getByRole("button", { name: "Lien copié !" })).toBeVisible();
  expect(await host.page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/r/${code}$`));
  await expect(host.page.getByRole("button", { name: "Encore 2 joueurs…" })).toBeDisabled();

  // --- Rejoindre par lien sans profil ---
  const lea = await newPlayer(browser);
  await lea.page.goto(`/r/${code}`);
  await lea.page.getByLabel("Ton pseudo").fill("Léa");
  await lea.page.getByRole("button", { name: "Rejoindre la partie" }).click();

  // --- Rejoindre par code, pseudo déjà pris ---
  const paul2 = await newPlayer(browser, "Paul");
  await paul2.page.getByLabel("Code de la partie").fill(code.toLowerCase());
  await paul2.page.getByRole("button", { name: "Rejoindre" }).click();

  for (const p of [host, lea, paul2]) await expect(players(p.page)).toHaveCount(3);
  await expect(lea.page.locator(".player-list")).toContainText("Paul 2");
  await expect(lea.page.locator(".player-list li").first()).toContainText("Hôte");
  await expect(lea.page.getByText("En attente du lancement par l'hôte…")).toBeVisible();
  await expectMobileFriendly(host.page);

  // --- Catégories : Coquin désactivée par défaut, badge visible par tous une fois activée ---
  await expect(paul2.page.locator(".categories-summary")).toContainText("Soft · Fun · Perso");
  await expect(paul2.page.locator(".categories-summary")).not.toContainText("Coquin");
  await expect(paul2.page.getByRole("checkbox")).toHaveCount(0);
  await expect(host.page.getByLabel(/Coquin/)).not.toBeChecked();
  await host.page.getByText("Coquin").click();
  await expect(paul2.page.getByText(/Questions coquines au programme/)).toBeVisible();

  // --- Questions proposées par les joueurs + file de l'hôte ---
  await lea.page.getByRole("button", { name: /Proposer une question/ }).click();
  await lea.page.getByRole("radio", { name: /oui\/non/ }).click();
  await lea.page.getByLabel("Ta question").fill("As-tu déjà chanté sous la pluie ?");
  await lea.page.getByRole("button", { name: "Envoyer" }).click();
  await expect(lea.page.getByText("Question envoyée ✓")).toBeVisible();
  await lea.page.getByRole("radio", { name: /Qui de nous/ }).click();
  await lea.page.getByLabel("Ta question").fill("Qui a la question à retirer ?");
  await lea.page.getByRole("button", { name: "Envoyer" }).click();
  await expect(lea.page.getByText("2/3 questions en attente")).toBeVisible();
  await expectMobileFriendly(lea.page);
  await lea.page.getByRole("button", { name: "Fermer" }).click();

  const queue = host.page.locator(".queue li");
  await expect(queue).toHaveCount(2);
  await expect(queue.first()).toContainText("As-tu déjà chanté sous la pluie ?");
  await expect(host.page.locator(".queue")).not.toContainText("Léa");
  await host.page.getByRole("button", { name: "Retirer la question « Qui a la question à retirer ? »" }).click();
  await expect(queue).toHaveCount(1);

  // --- Lancement : la question du joueur passe en premier ---
  await host.page.getByRole("button", { name: "Lancer la partie" }).click();
  for (const p of [host, lea, paul2]) {
    await expect(p.page.locator(".question-text")).toHaveText("As-tu déjà chanté sous la pluie ?");
    await expect(p.page.getByText("Question d'un joueur")).toBeVisible();
  }
  await expectMobileFriendly(paul2.page);

  // --- Arrivée en cours de manche : spectateur ---
  const max = await newPlayer(browser, "Max", "🐸");
  await max.page.goto(`/r/${code}`);
  await expect(max.page.getByText(/Tu joues à la prochaine/)).toBeVisible();
  await expect(host.page.getByText("0/3 ont répondu")).toBeVisible();

  // --- Réponses, progression sans contenu, révélation dès que tout le monde a répondu ---
  await host.page.getByRole("radio", { name: "Oui" }).click();
  await lea.page.getByRole("radio", { name: "Non" }).click();
  await lea.page.getByRole("radio", { name: "Oui" }).click(); // changement d'avis
  await expect(paul2.page.getByText("2/3 ont répondu")).toBeVisible();
  await expect(paul2.page.locator(".progress-avatars .answered")).toHaveCount(2);
  await expect(host.page.getByText(/Réponse enregistrée en secret/)).toBeVisible();
  await paul2.page.getByRole("radio", { name: "Non" }).click();

  for (const p of [host, lea, paul2, max]) {
    await expect(p.page.locator(".big-number")).toContainText("2");
    await expect(p.page.getByText("sur 3 ont répondu « oui »")).toBeVisible();
  }
  await expectMobileFriendly(lea.page);

  // --- Enchaînement automatique après 8 s ; le spectateur participe ---
  await expect(max.page.getByText("N°02")).toBeVisible({ timeout: 12_000 });
  await expect(max.page.getByText(/Tu joues à la prochaine/)).toHaveCount(0);
  await expect(host.page.getByText("0/4 ont répondu")).toBeVisible();
  await expectMobileFriendly(max.page);

  // --- Pause : la révélation reste affichée jusqu'à la reprise ---
  await host.page.getByRole("button", { name: "Pause" }).click();
  await host.page.getByRole("button", { name: "Révéler" }).click();
  for (const p of [lea, max]) await expect(p.page.getByText("En pause")).toBeVisible();
  await expect(lea.page.getByText(/Pas assez de réponses/)).toBeVisible();
  await lea.page.waitForTimeout(9_000);
  await expect(lea.page.getByText("En pause")).toBeVisible();
  await host.page.getByRole("button", { name: "Reprendre" }).click();
  await expect(lea.page.getByText("N°03")).toBeVisible();

  // --- Une manche de vote jusqu'au gagnant ---
  // (on passe jusqu'à tomber sur une question « Qui… ? » du paquet)
  for (let i = 0; i < 20 && (await host.page.locator(".vote-grid").count()) === 0; i++) {
    const before = await host.page.locator(".round-meta span").first().textContent();
    await host.page.getByRole("button", { name: "Passer" }).click();
    await expect(host.page.locator(".round-meta span").first()).not.toHaveText(before!);
  }
  await expect(host.page.locator(".vote-grid")).toBeVisible();
  await expectMobileFriendly(host.page);
  for (const p of [host, lea, paul2, max]) await p.page.getByRole("radio", { name: /^Max/ }).click();
  for (const p of [host, lea]) {
    await expect(p.page.locator(".winner-name")).toHaveText("Max");
    await expect(p.page.getByText("4 voix")).toBeVisible();
  }

  // --- Anonymat : aucune trame ne contient d'identifiant d'appareil ni la réponse d'un autre ---
  for (const p of [host, lea, paul2, max]) {
    const states = p.frames.filter((f) => f.includes('"type":"state"'));
    expect(states.length).toBeGreaterThan(5);
    const ids = new Set<string>();
    for (const f of states) {
      const answers = (JSON.parse(f).state.players as { id: string }[]).map((x) => x.id);
      answers.forEach((id) => ids.add(id));
      expect(f).not.toMatch(/deviceId|authorDeviceId|"answers"/);
    }
  }
  const deviceIds = await Promise.all(
    [host, lea, paul2, max].map((p) => p.page.evaluate(() => JSON.parse(localStorage.getItem("ambianceur.profile")!).deviceId as string)),
  );
  for (const p of [host, lea, paul2, max]) {
    for (const f of p.frames) for (const id of deviceIds) expect(f).not.toContain(id);
  }

  // --- Arrêt par l'hôte : fin de partie puis retour au lobby ---
  await host.page.getByRole("button", { name: "Arrêter" }).click();
  for (const p of [host, max]) await expect(p.page.getByText("Fin de partie !")).toBeVisible();
  await expectMobileFriendly(max.page);
  await expect(host.page.getByRole("button", { name: "Lancer la partie" })).toBeVisible({ timeout: 10_000 });

  // --- Exclusion ---
  await host.page.getByRole("button", { name: "Exclure Max" }).click();
  await expect(max.page.getByText("Tu as été exclu de cette partie")).toBeVisible();
  await expect(players(host.page)).toHaveCount(3);

  for (const p of [host, lea, paul2, max]) await p.context.close();
});

test("reconnexion après une coupure réseau, et partie introuvable", async ({ browser }) => {
  const host = await newPlayer(browser, "Hôte");
  await host.page.getByRole("button", { name: "Créer une partie" }).click();
  const code = (await host.page.locator(".room-code").textContent())!.trim();
  const b = await newPlayer(browser, "Bob");
  // Coupure réseau simulée : on intercepte les WebSockets de Bob pour pouvoir les couper.
  let offline = false;
  const sockets: { close: () => Promise<void> }[] = [];
  await b.page.routeWebSocket(/\/parties\//, (ws) => {
    if (offline) {
      void ws.close();
      return;
    }
    ws.connectToServer();
    sockets.push(ws);
  });
  await b.page.goto(`/r/${code}`);
  await expect(players(b.page)).toHaveCount(2);

  offline = true;
  for (const ws of sockets.splice(0)) await ws.close();
  await expect(b.page.getByText("Reconnexion…")).toBeVisible({ timeout: 15_000 });
  offline = false;
  await expect(b.page.getByText("Reconnexion…")).toHaveCount(0, { timeout: 20_000 });
  await expect(players(b.page)).toHaveCount(2);
  await expect(players(host.page)).toHaveCount(2);

  await b.page.goto("/r/ZZZZ");
  await expect(b.page.getByText("Partie introuvable")).toBeVisible();
  await expect(b.page).toHaveURL(/\/$/);

  await b.page.getByLabel("Code de la partie").fill("WXYZ");
  await b.page.getByRole("button", { name: "Rejoindre" }).click();
  await expect(b.page.getByText("Partie introuvable")).toBeVisible();

  await host.context.close();
  await b.context.close();
});

test("PWA : installable, coque en cache, accueil hors ligne", async ({ browser }) => {
  const p = await newPlayer(browser, "Zoé");
  await p.page.goto("/");
  await p.page.evaluate(() => navigator.serviceWorker.ready);
  await p.page.reload();
  await expect.poll(() => p.page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const manifest = await (await p.page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Ambianceur", display: "standalone", lang: "fr" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));

  const cdp = await p.context.newCDPSession(p.page);
  const { installabilityErrors } = (await cdp.send("Page.getInstallabilityErrors")) as {
    installabilityErrors: { errorId: string }[];
  };
  expect(installabilityErrors).toEqual([]);

  await p.context.setOffline(true);
  const started = Date.now();
  await p.page.reload();
  await expect(p.page.getByRole("heading", { name: "Ambianceur" })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(1_000);
  // Sans réseau, tenter de jouer explique que la connexion est nécessaire.
  await p.page.getByRole("button", { name: "Créer une partie" }).click();
  await expect(p.page.getByText(/Vérifie ta connexion/)).toBeVisible();
  await p.context.close();
});
