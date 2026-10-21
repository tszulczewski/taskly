# POSTĘP: design system Taskly (Storybook)

Plik roboczy prowadzony według `.ai/design/prompt-storybook.md`. Nowa sesja zaczyna od przeczytania tego pliku.

- Zadanie: design system w `packages/ui`, Storybook w `packages/ui/.storybook`, dokumentacja po angielsku.
- Etapy: 0 inwentaryzacja i plan → 1 fundamenty → 2 komponenty bazowe (partie po ~6) → 3 komponenty produktu, wzorce, ekrany → 4 strony, które uczą → 5 sprawdzenie i raport. Po każdym etapie czekam na „dalej”.

## Stan

| Etap | Stan | Data |
|---|---|---|
| 0. Inwentaryzacja i plan | zakończony; P1–P5 rozstrzygnięte | 2026-10-21 |
| 1. Fundamenty | zakończony; F1–F8 przyjęte | 2026-10-21 |
| 2. Komponenty bazowe | nie rozpoczęty | — |
| 3. Produkt, wzorce, ekrany | nie rozpoczęty | — |
| 4. Strony, które uczą | nie rozpoczęty | — |
| 5. Sprawdzenie i raport | nie rozpoczęty | — |

**Następny krok:** etap 2: najpierw lista różnic kształtu, gęstości i stanów względem shadcn oraz pytania o wysokość kontrolek, odstępy wewnętrzne i fokus; potem partia 1 komponentów.

## Przeczytane materiały

- `.ai/design/prompt-storybook.md` (zadanie)
- `.ai/specs/product-brief.md` (D01–D21, R01–R11, N01–N04)
- `.ai/specs/backlog.md` (E01–E04, historie E01-S01 … E03-S02)
- `.ai/specs/2026-10-16-tasks-and-subtasks.md` (E01; UI/UX, stany, przypadki brzegowe)
- `.ai/specs/2026-10-16-sign-in-pages.md` (prerekwizyt E01; ekrany logowania)
- `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md`
- `.ai/design/reference.md` (R01.1–R02.13, A01.1–A05, Q1–Q5, P01–P15, Luki 1–10), `.ai/design/reference/` (zrzuty, kod `R02-prototype.html`)
- `.ai/design/tokeny.md` (tokeny, kontrast, zasady 1–15, cechy komponentów, T1–T10)
- `.ai/docs/engineering-standards.md`, `AGENTS.md`, `.ai/lessons.md`
- Audyt z ćwiczenia 1: brak (podane w zadaniu).

## Stan repozytorium (2026-10-21)

| Co | Stan |
|---|---|
| Menedżer pakietów | npm 11.19 (workspaces), Node 24.21, jeden `package-lock.json` |
| Framework aplikacji | Next.js 16.4.0 (App Router, `cacheComponents`), React 19.3.0, TypeScript strict |
| Tailwind | 4.3.3 w `packages/app` (`@tailwindcss/turbopack`), konfiguracja CSS-first (`@import "tailwindcss"`) |
| Testy | Vitest 5.0.4, coverage v8 100% dla `packages/*/src/**` (obejmie też `packages/ui/src`), jsdom, agent-browser |
| `packages/ui` | pusty: `package.json` (`@taskly/ui`, peer `react ^19`), `src/index.ts` z `export {}`. Brak shadcn (`components.json`), brak komponentów |
| Style aplikacji | `packages/app/app/globals.css`: startowe zmienne Next (`--background`, `--foreground`, `prefers-color-scheme: dark`), font Geist przez `next/font/google` w `layout.tsx` |
| Storybook, tokeny w kodzie | brak |
| Lint | ESLint: `ui` nie importuje `@taskly/*`; `no-console`; brak `any` |
| Prettier | ignoruje `*.md` |

## Decyzje (z materiałów; zatwierdzone przez product ownera 2026-10-21, chyba że zaznaczono inaczej)

1. Charakter: prosty, czytelny, oszczędny, rzeczowy, spokojny. Antycharakter: jaskrawy, rozproszony, przeładowany, techniczny, generyczny (reference.md, nagłówek).
2. Motyw ciemny domyślny; jasny włączany przełącznikiem w aplikacji, dwie pozycje Ciemny / Jasny, bez „jak w systemie” (Q1, Luki 2, tokeny zasada 14).
3. Głębia z tonu powierzchni i linii 1px; bez cieni, gradientów, tekstur (R01.1, zasada 1).
4. Kolor w dwóch rolach: zielony akcent tylko dla działania i stanu „ukończone”; barwy miejsc tylko jako kropka 8px przy nazwie (R01.2, R02.3, Q3, Luki 3, zasady 2–3).
5. Jeden krój Instrument Sans; rozmiary 13/15/22 (16 w polach na telefonie); grubości 400/600; hierarchia kolorem tekstu; bez wersalików; cyfry `tabular-nums` (R01.3, R02.4, Luki 1, P12, zasada 4).
6. Lista to jedna ciągła powierzchnia; wiersz dwulinijkowy 64px: uchwyt, strzałka, checkbox, tytuł, kwota-przedział po prawej; druga linia: miejsca, „Ważne”, „Pilne”, „1/3”; podzadania wcięte o 24px (R02.1, R02.5, Luki 6).
7. Szczegóły rozwijają się w wierszu; bez szuflad, okien nad treścią, panelu w panelu i kafelków; jedna linia przyszłych wydatków + zwinięte „N zadań bez szacunku” (Q2, R02.6, R02.7, P04, Luki 9, zasady 8–9).
8. Nie każdy element jest przyciskiem: puste pole to wyciszony tekst zachęty; szybkie dodawanie samym tytułem i widoczne „Dodaj podzadanie” (R01.4, R02.9, P05, zasada 6).
9. Ikony Lucide tylko dla znanych gestów (uchwyt, strzałka, „…”, plus, motyw); ruch 150/200 ms ease-out, nic przy `prefers-reduced-motion`; ładowanie to statyczne paski (Luki 7–8, zasady 11–12).
10. Antyreferencje: A01.1 jaskrawy pasek, A01.2 tablica kolumn, A01.3 przeładowana karta i okno nad treścią, A02 generyczny wygląd AI, A03 rozbudowana aplikacja, A04 arkusz, A05 narzędzie dla informatyka. Konflikty: ciemny z R01, paleta z R02 (oba motywy), z R02 tylko zakres wersji 1 (P03), elementy AI-podpisu z R02 odrzucone (P12), ukończone na końcu listy tylko w wyświetlaniu (Luki 10).

Decyzje podjęte w tym zadaniu (product owner, 2026-10-21; wszystkie propozycje przyjęte):

- **P1:** komponenty produktu jako czysto prezentacyjne w `packages/ui/src/product/<epik>/`: propsy na wejściu, callbacki na wyjściu, bez `fetch`, bez reguł domeny, bez importu `@taskly/core`, kwoty przychodzą sformatowane. `app` owija je hookami TanStack Query. Wyjątek trzeba dopisać do standardów §5 (`.ai/docs/engineering-standards.md`). Symulowanie API w stories przez asynchroniczne handlery w propsach, bez MSW.
- **P2:** obowiązuje Luki 6 i R02.1: opis zadania widać dopiero po rozwinięciu wiersza, akcje wiersza są w menu „…”. Spec E01 (UI/UX) poprawić osobno.
- **P3:** wariant A, bez nowych tokenów: przycisk usuwania to przycisk drugorzędny z tekstem `color-text-danger`; alert błędu to `color-surface-raised` z tekstem `color-text-danger`. Bez kolorów sukcesu, ostrzeżenia i informacji.
- **P4:** nie budujemy: Avatar, Tabs, Toast, StatusBadge, Select, Switch, zwykły Dialog, wzorzec „lista z filtrami”; trafiają do „What is missing” z uzasadnieniem. Przełącznik motywu to dwupozycyjna grupa radio (RadioGroup zostaje jako prymityw). Tooltip tylko jako dodatkowy podpis przycisków-ikon; nazwa dostępna zawsze w `aria-label`.
- **P5:** stories domyślnie po angielsku (teksty ze speców), plus story „Polish” przy komponentach z tekstem. Ton z Luki 5 w obu językach.

## Etap 1: co powstało (2026-10-21)

- Zależności: dev `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest` (10.6.3), `@vitest/browser`, `@vitest/browser-playwright` (5.0.4), `playwright`, `vite` 8, `tailwindcss` i `@tailwindcss/vite` 4.3.3, `remark-gfm`, `react`, `react-dom`, `@types/react*`; runtime `@fontsource/instrument-sans`, `lucide-react`. Wszystkie z planu. `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` dojdą w etapie 2. `storybook init` nie był uruchamiany (konfiguracja ręczna, więc bez onboardingu).
- Tokeny: `src/styles/tokens.css` (3 warstwy, źródło w komentarzu każdego tokenu, ciemny na `:root`, jasny na `[data-theme="light"]`, zerowe czasy ruchu przy `prefers-reduced-motion`), `theme.css` (most do Tailwinda: `@theme inline reference`, bez domyślnego motywu Tailwinda), `base.css`, `index.css` (eksport `@taskly/ui/styles.css`, fonty z `@fontsource`).
- Kontrast policzony ponownie z zapisanych wartości: zgodny z `tokeny.md`; jedyna para poniżej progu to `color-border-divider` (przyjęty wyjątek T1).
- Storybook: `.storybook/main.ts` (docs + remark-gfm, a11y, vitest; bez checklisty, bez komunikatów o wersji, bez telemetrii, bez przełącznika tła), `preview.tsx` (przełącznik motywu ustawia `data-theme` na `<html>`, `a11y.test = 'error'`, szerokości 320/768/1440, kolejność menu), `manager.ts` (marka „Taskly”, tytuł karty „… ⋅ Taskly”).
- Foundations (7 stron MDX + 27 stories): Color (role, miejsca, kontrast mierzony w przeglądarce w obu motywach), Typography, Spacing and layout, Shape and depth, Motion (test interakcji), Icons, Themes. Bloki dokumentacji w `.storybook/blocks/` (tylko dokumentacja, bez eksportu).
- Testy: `vitest.config.ts` z projektami `storybook-dark` i `storybook-light`; `npm run test:storybook` uruchamia każdą story w obu motywach.
- Skrypt `npm run check:tokens` (`scripts/check-tokens.mjs`): kolory spoza `tokens.css`, klasy palety, wartości arbitralne, klasy domyślnej skali Tailwinda, surowe długości w CSS `src/`; kod wyjścia 1.
- Konfiguracja poza `ui`: skrypty w root `package.json`, `storybook-static/` w `.gitignore`, `.prettierignore` i ignorach ESLint.

### Etap 1: propozycje (wszystkie przyjęte przez product ownera 2026-10-21)

- **F1.** `layout-text-measure` = 65ch dla tekstu ciągłego (z promptu; brak w `tokeny.md`).
- **F2.** `icon-size` = 20px (Luki 7 ustala zestaw i kreskę, nie rozmiar).
- **F3.** Rola „nagłówek sekcji” = 15px / 600; rola „etykieta” = 15px / 400 (są tylko trzy rozmiary).
- **F4.** Reguła: na jednym ekranie ta sama relacja zawsze ma ten sam odstęp.
- **F5.** Jedyny breakpoint `wide:` = 640px (z T7). Proponuję użyć go też do przełączenia wiersza zadania na układ telefonu (kwota pod tytułem, Luki 6).
- **F6.** Strony dokumentacji zostają w jasnym stylu Storybooka; podglądy mają własne tło z tokenów i podążają za motywem.
- **F7.** Ikona karty przeglądarki to nadal ikona Storybooka. Brak logo produktu w materiałach, więc nie wymyślam go. Decyzja: zostaje, logo nie wymyślamy.
- **F8.** Do CI (zrobione: job `design-system` w `.github/workflows/ci.yml`, niewypchnięty): `npm run check:tokens` i `npm run test:storybook` (wymaga `npx playwright install chromium` w CI). Wpięcie testów stories w 100% pokrycia `npm test` zaproponuję w etapie 2, gdy powstaną komponenty.

## Pytania z etapu 0 (rozstrzygnięte 2026-10-21, decyzje wyżej)

- **P1. Gdzie żyją komponenty produktu?** Standardy §5 każą trzymać komponenty konkretnej domeny w `packages/app/components/<concept>/`, a `ui` ma być „presentational and generic”. Zadanie chce w design systemie sekcji Product (wiersz zadania, szybkie dodawanie itd.). Propozycja: komponenty produktu jako czysto prezentacyjne w `packages/ui/src/product/<epik>/` (propsy na wejściu, callbacki na wyjściu, bez `fetch`, bez reguł domeny, bez importu `@taskly/core`; kwoty przychodzą sformatowane), a `app` owija je hookami TanStack Query. Wymaga dopisania tego wyjątku do standardów §5. Alternatywa: Storybook ładuje stories z `packages/app/components` (wtedy potrzebne MSW i atrapy hooków).
- **P2. Konflikt: opis zadania i akcje w wierszu.** Spec E01 (2026-10-16, UI/UX): opis widoczny w wierszu, przycięty do 2 linii; akcje „Add subtask”, „Edit”, „Delete” w wierszu. Luki 6 (2026-10-21): opis tylko po rozwinięciu wiersza; R02.1 i A01.3: akcje w menu „…”. Propozycja: obowiązuje nowsza decyzja (Luki 6, menu „…”), a spec E01 zostaje poprawiony osobno, za Twoją zgodą.
- **P3. Kolor akcji niszczącej i komunikatów.** Tokeny mają tylko `color-text-danger` (błąd walidacji). Brakuje: wyglądu przycisku „Usuń zadanie” w dialogu potwierdzenia oraz tła/obramowania alertu błędu. Propozycja A (bez nowych tokenów): przycisk usuwania jako przycisk drugorzędny z tekstem `color-text-danger`, alert jako `color-surface-raised` + tekst `color-text-danger`. Propozycja B: nowy token `color-action-danger` (`red-300` / `red-700`, wartości już są w surowych). Kolorów sukcesu / ostrzeżenia / informacji nie dodaję (zasada 2).
- **P4. Które komponenty z listy minimalnej odpadają?** Wersja 1 ich nie potrzebuje, więc propozycja: nie budować, tylko wpisać do „What is missing” z uzasadnieniem: awatar (N02, R02.8), zakładki (R01.6, P02), toast (spec E01: „toast-free inline error”), znacznik statusu (statusów nie ma; markery to zwykłe słowa, Luki 4; pigułki to A02), select i przełącznik (żaden ekran ich nie używa), zwykły dialog (Q2, A01.3, A03), wzorzec „lista z filtrami” (filtrów nie ma w zakresie, P03). Przełącznik motywu: dwupozycyjny przełącznik segmentowy z semantyką grupy radio (wtedy grupa radio zostaje jako prymityw). Podpowiedź (tooltip): tylko jako dodatkowy podpis przycisków-ikon, nazwa dostępna zawsze w `aria-label` (propozycja).
- **P5. Język przykładów w stories.** Luki 5 i spec logowania (Q3): E01 i logowanie najpierw po angielsku; reszta głównie po polsku. Propozycja: stories domyślnie po angielsku (teksty ze speców, np. „No estimate”, „Delete '{title}' and its N subtasks?”), plus story „Polish” przy komponentach z tekstem, do sprawdzania długości (np. „Dodaj szacunek”, „Zadania bez szacunku nie wliczają się do sumy.”). Ton z Luki 5 (krótko, tryb rozkazujący) stosuję w obu językach.

Pytania odłożone do etapu 2 (prompt każe je zadać przed pierwszą partią): wysokość kontrolek (R02 ma 36px, tokeny i spec E01 wymagają celu 44px na telefonie), wewnętrzne odstępy przycisków i pól, grubość i odsunięcie obrysu fokusu (kod R02: 2px, odsunięcie 2px; token koloru T6 przyjęty).

## Baza komponentów

**shadcn/ui na prymitywach Radix (`radix-ui`), ikony Lucide.** Nie wybieram jej od zera: shadcn/ui jest wiążącą decyzją stosu w `AGENTS.md` (Stack: „Tailwind CSS, shadcn/ui”), standardy §5 każą dodawać prymitywy przez `npx shadcn@latest add`, a Lucide jest już przyjęty (Luki 7). Radix zamiast Base UI (shadcn 4 obsługuje oba): dojrzała obsługa klawiatury, fokusu i ARIA zgodna ze wzorcami WAI-ARIA APG, której potrzebują dialog, menu i popover (propozycja). Kod shadcn kopiujemy do pakietu i przerabiamy na tokeny; pochodzenie bazy trafi tylko do notatki technicznej (zasada 10 zadania).

## Plan techniczny (propozycja)

- **Pakiet:** `packages/ui` (`@taskly/ui`), konsumowany jako źródło TS przez `transpilePackages` (już ustawione w `next.config.ts`).
  - `src/styles/tokens.css`: trzy warstwy z `tokeny.md` (surowe, znaczeniowe z komentarzem źródła, komponentowe). Ciemny na `:root` (domyślny), jasny pod `:root[data-theme="light"]`.
  - `src/styles/theme.css`: Tailwind 4 `@theme inline`, który najpierw zeruje domyślne skale (`--color-*: initial`, `--spacing-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--font-*`), a potem mapuje tylko tokeny znaczeniowe (np. `bg-surface-list`, `text-muted`, `gap-group`, `p-inset`, `rounded-control`, `text-meta`). Klasy palety typu `bg-zinc-900` przestają istnieć.
  - `src/styles/index.css` eksportowany jako `@taskly/ui/styles.css`; font Instrument Sans 400 i 600 z `@fontsource/instrument-sans` (latin + latin-ext dla polskich znaków), bez CDN.
  - `src/lib/cn.ts`: `clsx` + `tailwind-merge` skonfigurowany pod własne nazwy klas (inaczej `text-meta` i `text-muted` wzajemnie się usuwają).
  - `src/components/ui/*`: prymitywy shadcn przerobione na tokeny. `src/components/*`: generyczne wzorce (pole formularza, pusty stan, stan błędu, szkielet). `src/product/<epik>/*`: komponenty produktu (P1).
  - `docs/*.mdx`: strony Design system i Foundations; dokumentacja komponentu w `*.mdx` obok komponentu, stories w `*.stories.tsx` obok komponentu.
  - `.storybook/`: `main.ts`, `preview.tsx`, `manager.ts` (marka „Taskly”), `blocks/` (próbka koloru, tabela tokenów, tabela kontrastu; tylko dokumentacja, bez eksportu z pakietu), `preview.css` (zamrożone stany `[data-preview-state="hover|focus-visible|active"]`).
- **Storybook 10.6.x** z frameworkiem `@storybook/react-vite` (pakiet `ui` nie zależy od Next.js), Vite 8 + `@tailwindcss/vite` 4.3.
- **Dodatki:**
  - `@storybook/addon-docs`: MDX i autodocs; tabele przez `remark-gfm` w `mdxPluginOptions`.
  - `@storybook/addon-a11y`: `parameters.a11y.test = 'error'` w preview.
  - `@storybook/addon-vitest` + `@vitest/browser-playwright` + `playwright` (Chromium): stories jako testy w Vitest (play functions, a11y). Interakcje przez wbudowane `storybook/test`. Zgodność z Vitest 5.0.4 sprawdzę na starcie etapu 1.
  - Przełącznik motywu: własny `globalTypes.theme` w pasku narzędzi + dekorator ustawiający `document.documentElement.dataset.theme` (zasada 9), bez `addon-themes`.
  - Symulowanie API (P1): `ui` nie ma `fetch`, więc odpowiedzi serwera symulują asynchroniczne handlery w propsach (`onSubmit` zwracające sukces / oczekiwanie / błąd pola / błąd serwera / brak sieci). Bez MSW.
  - Wyłączone: `addon-onboarding` (usuwam po `storybook init`), komunikaty o nowej wersji (`core.disableWhatsNewNotifications`), telemetria.
- **Skrypty** (`packages/ui`): `storybook` (dev, port 6006), `build-storybook`, `test:storybook` (Vitest, projekt storybook), `test:storybook:themes` (dwa przebiegi: ciemny i jasny), `check:tokens` (skrypt Node: kolory hex/rgb/hsl/oklch poza `tokens.css`, klasy palety Tailwinda, wartości arbitralne `-[…]`; kod wyjścia ≠ 0). Na poziomie roota: te same nazwy przez `-w @taskly/ui`.
- **Konfiguracja poza `ui` (tylko podłączenie, zasada 11):** skrypty w root `package.json`; `storybook-static/` w `.gitignore` i `.prettierignore`; `vitest.config.mts`: projekt storybook obok unit, żeby testy stories liczyły się do 100% pokrycia `packages/ui/src` (propozycja; alternatywa: osobne testy jsdom każdego komponentu). Dodanie kroku do CI zaproponuję, ale nie wypycham niczego.
- **Bez zmian w aplikacji:** `packages/app/app/globals.css` i font Geist zostają (zasady 11–12). Podpięcie `@taskly/ui/styles.css` w aplikacji to osobna decyzja (sekcja „Istniejący system”).
- **Zasoby VPS:** Storybook jest tylko narzędziem deweloperskim; nie trafia do buildu standalone i nie buduje się na VPS.

**Zależności w planie** (wszystko poza tą listą wymaga zgody, zasada 6):
- runtime `@taskly/ui`: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@fontsource/instrument-sans`; w etapie 3 (E02, przeciąganie) `@dnd-kit/core`, `@dnd-kit/sortable` (dnd-kit jest w stosie z AGENTS.md);
- dev `@taskly/ui`: `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest`, `@vitest/browser-playwright`, `playwright`, `vite`, `@vitejs/plugin-react` (jeśli framework go wymaga), `tailwindcss`, `@tailwindcss/vite`, `remark-gfm`, `shadcn` (CLI, tylko przez `npx`, bez instalacji).

## Ekrany ze specyfikacji

| Id | Ekran | Źródło |
|---|---|---|
| S1 | `/sign-in`: e-mail, hasło z przełącznikiem widoczności, „Sign in”, link „Create an account” gdy rejestracja otwarta, błędy nad formularzem | spec logowania, UI/UX |
| S2 | `/sign-up` otwarta: imię, e-mail, hasło z podpowiedzią „At least 10 characters”, „Create account” | spec logowania |
| S3 | `/sign-up` zamknięta: komunikat i link do logowania | spec logowania |
| S4 | Pasek górny: nazwa, przełącznik motywu, „Sign out” z błędem wylogowania; na telefonie dolna nawigacja (lista, przyszłe wydatki) | spec logowania (AppHeader), P01, P07, R02.11, Luki 2 |
| S5 | `/` lista zadań: szybkie dodawanie (+ „Details”: opis, min, max), wiersze z podzadaniami, edycja w wierszu, potwierdzenie usunięcia, ładowanie / pusto / błąd, wiersz oczekujący, błąd po wycofaniu | spec E01, UI/UX i Edge cases; R02.1, R02.9 |
| S6 | Wiersz rozwinięty (szczegóły zadania w miejscu) | Q2, Luki 6 |
| S7 | Kolejność, markery, miejsca na liście (przeciąganie, „Ważne”/„Pilne”, przypisanie do kilku miejsc) | backlog E02-S01…S03 (bez speca), decyzja 2026-10-21 |
| S8 | Ukończenie i ponowne otwarcie; przyszłe wydatki (linia sumy + zwinięte zadania bez szacunku) | backlog E03-S01, E03-S02 (bez speca), Luki 9–10 |

E02 i E03 nie mają specyfikacji; ich komponenty wyprowadzam z backlogu, `reference.md` i `tokeny.md`. Otwarte w backlogu: jak powstają miejsca i jak mają się do list (wpływa na wybór miejsc i barwy).

## Komponenty bazowe (plan)

| Komponent | Ekrany | Uwagi |
|---|---|---|
| Button (główny, drugorzędny, tekstowy; rozmiar ikony; stan ładowania) | S1–S5, S8 | „Sign in”, „Add”, „Save”, „Try again”, „Delete task”; spinner przy wysyłaniu (spec logowania) |
| Link i TextAction | S1–S3, S5, S8 | „Create an account”; „Dodaj szacunek”; tekst zachęty pustego pola (R01.4) |
| Input (z przyrostkiem „zł”, `inputmode="decimal"`) | S1, S2, S5 | kwoty min/max (spec E01) |
| PasswordInput (przycisk pokaż/ukryj, `aria-pressed`) | S1, S2 | spec logowania Q10 |
| Textarea | S5, S6 | opis zadania |
| Checkbox | S5, S7, S8 | ukończenie (20px, cel 44px na telefonie), markery, wybór miejsc |
| Label + FormField (etykieta, podpowiedź, błąd, wymagane/opcjonalne) | S1, S2, S5 | `aria-describedby` (spec E01, spec logowania) |
| Surface (powierzchnia listy / karta logowania) | S1–S3, S5, S8 | `radius-surface`, bez cienia |
| Alert (błąd, `role="alert"`) | S1, S2, S4, S5 | `color-surface-raised` + `color-text-danger` (P3) |
| ConfirmDialog (AlertDialog) | S5 | usuwanie zadania |
| Menu (DropdownMenu, „…”) | S5–S7 | dodaj podzadanie, edytuj, usuń, markery |
| Popover | S7 | wybór miejsc, wybór barwy miejsca |
| Tooltip | S5, S7 | tylko jako dodatkowy podpis ikon; nazwa w `aria-label` (P4) |
| Collapsible (rozwijanie) | S5, S6, S8 | „Details”, rozwinięcie wiersza, „N bez szacunku” |
| RadioGroup / przełącznik segmentowy | S4 | przełącznik motywu (P4) |
| Skeleton (statyczny) | S5, S8 | Luki 8 |
| EmptyState | S5, S8 | „No tasks yet. Add the first thing you need to do.” |
| ErrorState (komunikat + „Try again”) | S5, S8 | spec E01 |

Do „What is missing” (P4): Avatar, Tabs, Toast, StatusBadge, Select, Switch, zwykły Dialog.

## Komponenty produktu (plan; miejsce według P1)

| Epik | Komponent | Ekrany |
|---|---|---|
| Prerekwizyt (logowanie) | SignInForm, SignUpForm, SignUpClosed, SignOutButton (stan błędu) | S1–S4 |
| Powłoka | AppHeader, BottomNav (telefon), ThemeToggle, PageColumn (`layout-content-max-width`) | S4 |
| E01 | QuickAdd (tytuł + „Add” + „Details”) | S5 |
| E01 | TaskRow (2 linie, poziom zagnieżdżenia, oczekujący, rozwinięty) | S5, S6 |
| E01 | TaskList (powierzchnia, zagnieżdżone `ul`) | S5 |
| E01 | TaskForm (edycja w wierszu: tytuł, opis, min, max) | S5, S6 |
| E01 | EstimateRange („1 200–1 500 zł” / „No estimate”) | S5, S8 |
| E01 | DeleteTaskDialog (nazwa i liczba podzadań) | S5 |
| E02 | DragHandle (+ przenoszenie klawiaturą) | S7 |
| E02 | Markers („Ważne”, „Pilne” jako tekst) | S7 |
| E02 | PlaceTag (kropka + nazwa) | S5, S7 |
| E02 | PlacePicker (wiele miejsc), PlaceColorPicker (10 barw, zajęte wyłączone) | S7 |
| E03 | TaskCheckbox (ukończ / otwórz ponownie) | S8 |
| E03 | SubtaskProgress („1/3”) | S5, S8 |
| E03 | FutureExpenses (linia sumy, zasada jednym zdaniem) | S8 |
| E03 | UnestimatedTasks (zwinięta linia + lista z „Dodaj szacunek”) | S8 |

## Wzorce (plan)

| Wzorzec | Ekrany | Stany |
|---|---|---|
| Form | S1, S2, S5 | pusty, walidacja po opuszczeniu pola i przy wysłaniu, fokus na pierwszym błędzie, oczekiwanie (blokada podwójnego wysłania), sukces po serwerze, błąd pola, błąd serwera, brak sieci |
| List (pusto vs. brak wyników) | S5 | ładowanie, „jeszcze nic tu nie ma” z akcją dodania, błąd, dużo danych, długie teksty. Bez filtrów (P4) |
| Details in row | S6 | zwinięty, rozwinięty, „zadanie już nie istnieje albo brak dostępu” (404 w spec E01) |
| Delete confirmation | S5 | z podzadaniami i bez, oczekiwanie, błąd |
| Quick capture | S5 | tytuł → Enter, fokus zostaje, nowy wiersz na końcu |
| Inline edit | S5, S6 | edycja, błąd pola, anulowanie |
| Optimistic change | S5 | wiersz oczekujący z wyłączonymi akcjami, wycofanie z błędem w wierszu |
| Reorder | S7 | przeciąganie, klawiatura, ukończone nieprzeciągalne |
| Complete and reopen | S8 | ukończone na końcu, ponownie otwarte na początku, kaskada na podzadania |

## Drzewo menu Storybooka (plan)

```
Design system
  Start here · Components · How to choose · Usage and accessibility · Content
  What to avoid · What is missing · Contributing
  Epics: Sign-in (prerequisite) · E01 Tasks and subtasks · E02 Order, markers and spaces
         · E03 Completion and future expenses
Foundations
  Color · Typography · Spacing and layout · Shape and depth · Motion · Icons · Themes
Primitives
  Button · Text action and link · Input · Password input · Textarea · Checkbox · Form field
  Surface · Alert · Confirm dialog · Menu · Popover · Tooltip · Collapsible · Theme switch (radio group)
  Skeleton · Empty state · Error state
Product
  App shell · Sign-in · E01 Tasks and subtasks · E02 Order, markers and spaces
  · E03 Completion and future expenses   (każdy epik: komponenty + Screens)
Patterns
  Form · List · Details in row · Delete confirmation · Quick capture · Inline edit
  · Optimistic change · Reorder · Complete and reopen
```

Szacunek: ~19 prymitywów × ~7 stories ≈ 130; ~20 komponentów produktu × ~6 stanów danych ≈ 120; 9 wzorców × ~5 ≈ 45; 8 ekranów × ~4 stany ≈ 30. Razem około **320 stories**, około **65 stron MDX** (15 stron systemu i fundamentów + strona każdego komponentu i wzorca), około **60 testów interakcji**.

## Istniejący system: co zostaje, co zmienić, co usunąć (do decyzji)

| Element | Propozycja | Uzasadnienie |
|---|---|---|
| `packages/ui/package.json`, `src/index.ts` | zostaje, rozszerzam (eksporty, skrypty, zależności) | to jest docelowe miejsce systemu (AGENTS.md, standardy §5) |
| `packages/app/app/globals.css` (zmienne startowe Next, `prefers-color-scheme`) | bez zmian w tym zadaniu; później zastąpić importem `@taskly/ui/styles.css` | kod aplikacji poza katalogiem systemu (zasada 11); motyw z systemu operacyjnego jest sprzeczny z Q1 i Luki 2, więc przy podpięciu do usunięcia, za zgodą |
| Font Geist w `packages/app/app/layout.tsx` | bez zmian w tym zadaniu; później zastąpić Instrument Sans | Q4, Luki 1 |
| Reguła standardów §5 („concept-specific → app”) | dopisać wyjątek dla `packages/ui/src/product/` (P1 przyjęte); do zrobienia | miejsce komponentów produktu |
| Spec E01, UI/UX (opis w wierszu, akcje w wierszu) | poprawić według Luki 6 i R02.1 (P2 przyjęte); do zrobienia osobno | konflikt z Luki 6, R02.1 |

Niczego nie usuwam.

## Sprawy do zrobienia poza design systemem

- Dopisać wyjątek P1 do `.ai/docs/engineering-standards.md` §5 (proponuję w etapie 3, razem z pierwszymi komponentami produktu).
- Poprawić UI/UX w `.ai/specs/2026-10-16-tasks-and-subtasks.md` według P2 (opis po rozwinięciu, akcje w „…”); termin do ustalenia.

## Notatka techniczna

Baza komponentów: shadcn/ui (kod kopiowany do `src/components/ui`) na Radix, ikony Lucide. W interfejsie Storybooka widać tylko nazwę „Taskly”.
