# POSTĘP: design system Taskly (Storybook)

Plik roboczy prowadzony według `.ai/design/prompt-storybook.md`. Nowa sesja zaczyna od przeczytania tego pliku.

- Zadanie: design system w `packages/ui`, Storybook w `packages/ui/.storybook`, dokumentacja po angielsku.
- Etapy: 0 inwentaryzacja i plan → 1 fundamenty → 2 komponenty bazowe (partie po ~6) → 3 komponenty produktu, wzorce, ekrany → 4 strony, które uczą → 5 sprawdzenie i raport. Po każdym etapie czekam na „dalej”.

## Stan

| Etap                       | Stan                                                                          | Data       |
| -------------------------- | ----------------------------------------------------------------------------- | ---------- |
| 0. Inwentaryzacja i plan   | zakończony; P1–P5 rozstrzygnięte                                              | 2026-10-21 |
| 1. Fundamenty              | zakończony; F1–F8 przyjęte                                                    | 2026-10-21 |
| 2. Komponenty bazowe       | zakończony: partie 1–3 (K1–K5, B1–B9, C1–C10, D1–D10 rozstrzygnięte)          | 2026-10-22 |
| 3. Produkt, wzorce, ekrany | zakończony: partie 1–4 (E1–E12, F1–F14, G1–G6, H1–H10, I1–I4, J1–J10 rozstrzygnięte) | 2026-10-22 |
| 4. Strony, które uczą      | zakończony i sprawdzony; L1–L4 rozstrzygnięte i wdrożone                      | 2026-10-23 |
| 5. Sprawdzenie i raport    | sprawdzenie zrobione; M1–M5 przyjęte, M1–M3 wdrożone; test agentem czeka      | 2026-10-23 |

**Następny krok:** test agentem w nowej sesji z promptem `.ai/design/prompt-agent-test.md` (2026-10-23), potem uzupełnienie dokumentacji o miejsca, w których agent zgadywał. M4 zrobione: PR #28 scalony; design system scalony w PR #30.

## Etap 2: różnice względem shadcn (2026-10-22, przed partią 1)

Pierwsze podejście do etapu 2 zostało wycofane na prośbę product ownera 2026-10-21; odpowiedzi K1–K5 z tamtego podejścia nie obowiązują, pytam od nowa. Wartości shadcn: rejestr new-york v4 (Tailwind 4).

| Cecha                            | shadcn (domyślnie)                                        | Taskly                                                                                                                              | Źródło                                                                                                                                |
| -------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Wysokość przycisku i pola        | `h-9` (36px); `sm` 32, `lg` 40                            | 44px (K1); jeden rozmiar, bez `sm`/`lg`                                                                                             | spec E01 i spec logowania („touch targets of at least 44 px”), `touch-target-min` (T10); zasada 6 zadania (bez wariantów spoza planu) |
| Przycisk-ikona                   | `size-9`, widoczne tło                                    | cel 44×44, ikona 20px, tło dopiero przy najechaniu                                                                                  | `touch-target-min`, F2, kod R02 (`.icon-btn` przezroczysty, najechanie `surface-2`)                                                   |
| Promień kontrolek                | `rounded-md`                                              | `radius-control` 8px; checkbox `checkbox-radius` 6px                                                                                | T8, R02.1                                                                                                                             |
| Promień menu, popovera, dialogu  | `rounded-md` / `rounded-lg`                               | `radius-surface` 12px                                                                                                               | R01.1, T8; kod R02 (`.menu` 12px)                                                                                                     |
| Obramowanie pól i checkboxa      | `border-input` (niski kontrast)                           | 1px `color-border-control`                                                                                                          | zasada 15, T1 (WCAG 1.4.11)                                                                                                           |
| Przycisk drugorzędny             | `outline`: obramowanie + `shadow-xs`                      | przezroczysty, 1px `color-border-control`, bez cienia                                                                               | zasady 1 i 15                                                                                                                         |
| Przycisk usuwania                | `destructive`: czerwone tło                               | drugorzędny z tekstem `color-text-danger`                                                                                           | P3                                                                                                                                    |
| Cienie                           | `shadow-xs` na polach, `shadow-md/lg` na nakładkach       | brak wszędzie                                                                                                                       | zasada 1, R01.1                                                                                                                       |
| Nakładki (menu, popover, dialog) | tło `popover`, cień, `bg-black/50` pod dialogiem          | `color-surface-raised` + linia 1px; zasłona i krawędź: K2                                                                           | R01.1, zasada 1                                                                                                                       |
| Animacje nakładek                | `fade` + `zoom-in-95`                                     | K2                                                                                                                                  | Luki 8 milczy o nakładkach                                                                                                            |
| Typografia przycisku             | `text-sm font-medium` (14/500)                            | `font-size-body` 15 / `font-weight-strong` 600                                                                                      | Luki 1 (tylko 400/600), kod R02 (`.btn` 600)                                                                                          |
| Etykieta pola                    | `text-sm font-medium leading-none`                        | 15 / 400, `color-text-primary`                                                                                                      | F3                                                                                                                                    |
| Podpowiedź i błąd pola           | `text-sm` / `text-destructive`                            | 13 `color-text-muted` / 13 `color-text-danger`, powiązane `aria-describedby`                                                        | Luki 1, T5, spec logowania                                                                                                            |
| Rozmiar tekstu w polu            | `text-base md:text-sm`                                    | 16px poniżej 640px, 15px powyżej                                                                                                    | Luki 1 (`input-font-size-mobile`), F5                                                                                                 |
| Odstępy wewnętrzne               | przycisk `px-4`, pole `px-3`                              | przycisk 16px, pole 12px (propozycja: kod R02 14px i 10px zaokrąglone do skali)                                                     | kod R02, skala T7                                                                                                                     |
| Odstępy w polu formularza        | `gap-2` (shadcn Form)                                     | etykieta–pole–podpowiedź `space-inline` 4px; między polami `space-between-groups` 16px (propozycja: kod R02 5px i 12px zaokrąglone) | kod R02 (`.field`), T7, F4                                                                                                            |
| Fokus                            | pierścień 3px `ring/50`, bez odsunięcia                   | obrys 2px `color-focus-ring`, odsunięcie 2px; w polach odsunięcie 0 (K3)                                                            | kod R02 (`:focus-visible`, `input:focus`), T6                                                                                         |
| Najechanie                       | główny `primary/90`, inne `accent`                        | główny `color-action-primary-hover`; drugorzędny i ikona `color-surface-raised`                                                     | token z 2026-10-22; R01.1, kod R02                                                                                                    |
| Wciśnięty                        | brak osobnego stanu                                       | K4                                                                                                                                  | materiały milczą                                                                                                                      |
| Zablokowany                      | `opacity-50`, `pointer-events-none`                       | przezroczystość z tokenu (K3), kursor `not-allowed`; przycisk wysyłania blokowany tylko na czas oczekiwania                         | kod R02 (`opacity .55`), spec logowania („disabled and shows a spinner”)                                                              |
| Ładowanie                        | brak (dokładane ręcznie)                                  | pierścień CSS w `currentColor` + tekst („Signing in…”), `aria-busy`; przy ograniczonym ruchu nieruchomy (K3)                        | kod R02 (`.spin`, 0,7s), R02.12, zasada 12                                                                                            |
| Błąd pola                        | `aria-invalid` → `ring-destructive/20 border-destructive` | `aria-invalid` → obramowanie w kolorze `color-text-danger` + komunikat tekstem (kolor nie jest jedynym nośnikiem)                   | kod R02 (`input[aria-invalid]`), zasada 3                                                                                             |
| Zaznaczony checkbox              | `bg-primary`, `size-4`                                    | `color-action-primary` + znacznik `color-text-on-action`, 20px, cel 44px na telefonie                                               | T10, R02.1                                                                                                                            |
| Szkielet                         | `animate-pulse`, `bg-accent`                              | statyczne paski `color-surface-raised`                                                                                              | Luki 8, zasada 12                                                                                                                     |
| Wymagane / opcjonalne            | brak konwencji                                            | K5                                                                                                                                  | materiały milczą                                                                                                                      |

### Pytania przed partią 1 (rozstrzygnięte 2026-10-22: K1 wariant A, K2–K5 propozycje przyjęte)

- **K1. Wysokość kontrolek.** Specy E01 i logowania: cel co najmniej 44px, bez rozróżnienia szerokości; kod R02: 36px; `touch-target-min` w tokeny.md opisany „na telefonie”. Propozycja A: 44px na każdej szerokości (jeden rozmiar, literalnie według speców). B: 44px poniżej 640px, 36px powyżej (cel 44px tylko na telefonie).
- **K2. Nakładki bez cienia.** Menu, popover i dialog potwierdzenia: tło `color-surface-raised`, krawędź 1px `color-border-control` (`color-border-divider` ma 1,4:1 i ginie na tle strony). Zasłona pod dialogiem: nowy token `color-scrim` (kod R02: `rgba(10,16,13,.5)`; jasny i ciemny motyw osobno). Otwieranie i zamykanie bez animacji (Luki 8 wymienia tylko przeciąganie, zaznaczenie i rozwinięcie). Przyjąć wszystkie trzy?
- **K3. Nowe tokeny komponentów z kodu R02:** `focus-ring-width` 2px, `focus-ring-offset` 2px (w polach 0), `opacity-disabled` 0,55, `spinner-duration` 700ms (0 przy `prefers-reduced-motion`, wtedy znaczenie niesie tekst); oraz klasa `border-danger` w moście Tailwinda wskazująca istniejący `color-text-danger` (bez nowej wartości). Przyjąć?
- **K4. Stan „wciśnięty”.** Materiały milczą. Propozycja: taki sam jak najechanie (bez przesunięcia i zmiany skali), żeby nie dodawać nowych kolorów. Alternatywa: osobny, ciemniejszy ton (nowy token).
- **K5. Pola wymagane i opcjonalne.** Materiały milczą (formularze: logowanie wszystko wymagane; szybkie dodawanie tylko tytuł wymagany). Propozycja: oznaczamy słowem tylko pola opcjonalne („(optional)” / „(opcjonalnie)”), bez gwiazdki; wymagane mają `required` i komunikat błędu. Alternatywa: gwiazdka przy wymaganych.

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

| Co                         | Stan                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menedżer pakietów          | npm 11.19 (workspaces), Node 24.21, jeden `package-lock.json`                                                                                                            |
| Framework aplikacji        | Next.js 16.4.0 (App Router, `cacheComponents`), React 19.3.0, TypeScript strict                                                                                          |
| Tailwind                   | 4.3.3 w `packages/app` (`@tailwindcss/turbopack`), konfiguracja CSS-first (`@import "tailwindcss"`)                                                                      |
| Testy                      | Vitest 5.0.4, coverage v8 100% dla `packages/*/src/**` (obejmie też `packages/ui/src`), jsdom, agent-browser                                                             |
| `packages/ui`              | pusty: `package.json` (`@taskly/ui`, peer `react ^19`), `src/index.ts` z `export {}`. Brak shadcn (`components.json`), brak komponentów                                  |
| Style aplikacji            | `packages/app/app/globals.css`: startowe zmienne Next (`--background`, `--foreground`, `prefers-color-scheme: dark`), font Geist przez `next/font/google` w `layout.tsx` |
| Storybook, tokeny w kodzie | brak                                                                                                                                                                     |
| Lint                       | ESLint: `ui` nie importuje `@taskly/*`; `no-console`; brak `any`                                                                                                         |
| Prettier                   | ignoruje `*.md`                                                                                                                                                          |

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

## Etap 2, partia 1: co powstało (2026-10-22)

- **Decyzje K1–K5 (product owner, 2026-10-22):** K1 = A (44px na każdej szerokości); K2: nakładki `color-surface-raised` + krawędź `color-border-control`, token `color-scrim`, bez animacji otwierania; K3: tokeny `focus-ring-width`, `focus-ring-offset`, `focus-ring-offset-field`, `opacity-disabled`, `spinner-*` i klasa `border-danger`; K4: wciśnięty = najechanie; K5: słowo „(optional)” tylko przy polach opcjonalnych.
- **CLI:** `npx shadcn@4.22.1 add button input textarea label` z tymczasowym `components.json` (CSS CLI skierowany do pliku roboczego, żeby nie dopisał swoich zmiennych do `index.css`). CLI doinstalował pakiet npm `cn` spoza planu: odinstalowany. Zainstalowane z planu: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`. `components.json`, plik roboczy i ścieżki w `tsconfig.json` usunięte; kod CLI przepisany w całości (importy względne, tylko tokeny).
- **Tokeny:** `tokens.css` + `color-scrim` (oba motywy), `control-height`, `control-padding-x`, `field-padding-x`, `field-padding-y`, `focus-ring-*`, `opacity-disabled`, `spinner-size`, `spinner-stroke`, `spinner-duration` (0 przy ograniczonym ruchu). `theme.css`: `bg-scrim`, `border-danger`, `min-h-control`, `px-control-x`, `px-field-x`, `py-field-y`, `--default-border-width`, `--spacing-0` (zero dla `min-w-0`, `inset-y-0`; `check:tokens` przepuszcza `-0`). `base.css`: narzędzia `focus-ring`, `focus-ring-field`, `opacity-disabled`, `spinner`, wariant `field-focus`.
- **Komponenty** (`src/components/ui/`, `src/components/form-field.tsx`, eksport z `src/index.ts`): Button (primary, secondary — domyślny, danger, ghost; rozmiar `icon` z wymaganym `aria-label`; `loading`), TextAction (ton action / muted), Link (`asChild` dla `next/link`), Input (ramka, przyrostek „zł” w `aria-describedby`), PasswordInput (przycisk „Show password” 44×44 z `aria-pressed`, ukrywa hasło po wysłaniu formularza), Textarea, Label, FormField (etykieta, „(optional)”, podpowiedź, błąd, `aria-describedby`, `aria-invalid`, `aria-required`). `src/lib/cn.ts`: `tailwind-merge` znający nazwy tokenów.
- **Dokumentacja:** 6 stron po 13 sekcji w `.storybook/docs/primitives/` (Button, Text action and link, Input, Password input, Textarea, Form field) i 41 stories: Playground, warianty, macierz stanów (zamrożone najechanie, fokus, wciśnięcie przez `data-preview-state` i `@custom-variant` w `preview.css`), długa treść na 320px, Polish, Do and don't; 9 testów interakcji (kliknięcie, klawiatura, ładowanie, pokaż hasło, ukrycie po wysłaniu, przyrostek, walidacja po opuszczeniu pola). Bloki dokumentacji: `.storybook/blocks/Primitives.tsx` (StateRow, Stack, DoDont, Narrow), `withDocFrame`.
- **Testy jednostkowe** (jsdom, obok komponentów): 25 testów; `npm test` 100% pokrycia. Zamiast wpinać testy stories w pokrycie (F8) każdy komponent ma własne testy jsdom.

### Partia 1: sprawdzenie (2026-10-22)

- `npm run check:tokens`: czysto. `format:check`, `lint`, `typecheck`: bez błędów. `npm test`: 113 testów, 100% (instrukcje, gałęzie, funkcje, linie).
- `npm run test:storybook`: 136 testów (68 stories × 2 motywy), a11y = error, bez wyjątków.
- `npm run build-storybook`: sukces. W zbudowanym Storybooku (agent-browser): macierze stanów Button, TextAction/Link, Input, PasswordInput w obu motywach; strony Primitives mają 13 sekcji, tabele GFM renderują się jako tabele; Button na 320px bez przewijania w poziomie (`scrollWidth` = 320).
- `npm run build` (aplikacja, po usunięciu `.next`): sukces. `npm run audit`: exit 0 (tylko wcześniejsze zgłoszenia „moderate” w narzędziach vitest).
- Nie sprawdzone: czytnik ekranu (tylko drzewo dostępności w testach), Safari/iOS (zoom pola 16px), `test:integration` (brak zmian w aplikacji i bazie).

### Partia 1: propozycje B1–B9 (wszystkie przyjęte przez product ownera 2026-10-22)

- **B1.** Domyślny wariant Button to `secondary`; `primary` trzeba wybrać świadomie (najwyżej jeden na formularz).
- **B2.** Stan ładowania używa `aria-disabled` zamiast `disabled`: fokus zostaje na przycisku, kliknięcie i Enter są blokowane.
- **B3.** Długie etykiety przycisków i akcji tekstowych łamią się do drugiej linii, nigdy nie są ucinane.
- **B4.** TextAction: podkreślenie dopiero przy najechaniu; Link: zawsze podkreślony, bez zmiany przy najechaniu; Link nigdy nie jest „zablokowany” (usuwamy go).
- **B5.** Odstępy: przycisk 16px w poziomie, pole 12px w poziomie i 8px w pionie (Textarea), w polu formularza 4px, między polami 16px (kod R02 zaokrąglony do skali T7).
- **B6.** Treść: przecinek dziesiętny w kwotach po polsku („12,50”).
- **B7.** Zablokowane pole: przyciemnione jest tylko pole, a podpowiedź mówi dlaczego.
- **B8.** Kolejność przycisków: „Save” przed „Cancel” (kolejność czytania).
- **B9.** Textarea: domyślnie 3 wiersze, zmiana rozmiaru tylko w pionie, bez licznika znaków.

## Etap 2, partia 2: co powstało (2026-10-22)

- **CLI:** `npx shadcn@4.22.1 add checkbox radio-group collapsible alert skeleton` (tymczasowy `components.json` jak w partii 1). CLI znowu dodał pakiet `cn`: odinstalowany; inne zależności bez zmian. Pliki tymczasowe usunięte.
- **Tokeny i most:** `radio-dot-size` (C2), `size-radio-dot`, `border-action-hover`; `base.css`: narzędzie `collapsible-content` (otwieranie w `motion-duration-base`, 0 przy ograniczonym ruchu). `check:tokens` przepuszcza teraz zero w obramowaniu (`border-b-0`), ułamki (`w-1/2`) i nazwane grupy (`group-data-[state=open]/trigger:`) (C4).
- **Komponenty:** Checkbox (pole 20px w celu 44×44, wartości logiczne bez stanu „częściowo”), RadioGroup (`list` z RadioGroupItem, `segmented` z RadioGroupSegment dla przełącznika motywu), Surface (`padding` none / inset, `asChild`), Alert (`role="alert"`, tytuł, treść, akcja; tylko błąd, P3), Skeleton (statyczny pasek `h-lh`, `aria-hidden`), Collapsible (Root, Trigger, Indicator ze strzałką, Content z ruchem).
- **Dokumentacja:** 6 stron po 13 sekcji i 40 stories (macierze stanów, 320px, Polish, Do and don't); 8 testów interakcji (zaznaczanie myszą i spacją, klik w etykietę, strzałki w grupie radio i w przełączniku motywu, landmark Surface, ogłoszenie Alert, stan ładowania Skeleton, otwieranie Collapsible myszą i Enterem). Blok `StateRow` ma komórki `wide`.
- **Testy jednostkowe:** 11 nowych (jsdom); `npm test` 124 testy, 100%.

### Partia 2: sprawdzenie (2026-10-22)

- `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów. `npm test`: 124 testy, 100% we wszystkich czterech miarach.
- `npm run test:storybook`: 216 testów (108 stories × 2 motywy), a11y = error, bez wyjątków.
- `build-storybook` i `npm run build` (aplikacja, czysty `.next`): sukces. `npm run audit`: exit 0.
- Zbudowany Storybook (agent-browser): macierze stanów Checkbox (ciemny), Radio group (jasny i ciemny), Collapsible (ciemny), Alert (jasny), Skeleton (ciemny), Surface (jasny); 6 stron po 13 sekcji z tabelami; 5 stories na 320px bez przewijania w poziomie. Poprawione po oglądzie: szkielet w macierzy zwijał się do zera szerokości.
- Problem w testach: Radix RadioGroup zaznacza opcję strzałką tylko wtedy, gdy klawisz jest jeszcze wciśnięty, gdy przychodzi fokus (fokus przenosi w `setTimeout`); w play functions klawisz jest przytrzymany (`{ArrowRight>}`).
- Nie sprawdzone: czytnik ekranu, Safari/iOS.

### Partia 2: propozycje C1–C10 (rozstrzygnięte przez product ownera 2026-10-22)

Przyjęte wszystkie poza C7. **C7 zmienione:** tytuł alertu w `color-text-danger`, treść w zwykłym kolorze tekstu (`color-text-primary`); tytuł jest teraz wymagany. To doprecyzowuje P3 dla alertów.

- **C1.** Najechanie na pusty checkbox i kółko radio: tło `color-surface-raised`; na zaznaczony checkbox: `color-action-primary-hover`.
- **C2.** Nowy token `radio-dot-size` = 8px (kropka zaznaczonej opcji; materiały milczą, 8px jak w bazie).
- **C3.** Szkielet tylko przy pierwszym wczytaniu; przy kolejnych odświeżeniach zostają wcześniejsze dane.
- **C4.** `check:tokens` przepuszcza zero (`border-b-0`, `min-w-0`), ułamki szerokości (`w-1/2`) i nazwane grupy wariantów; to nie są wartości projektowe.
- **C5.** Checkbox bez stanu „częściowo zaznaczony”: postęp podzadań pokazuje „1/3” w wierszu (Luki 6).
- **C6.** Przełącznik segmentowy ma 46px wysokości: cele 44px plus ramka 1px z każdej strony.
- **C7.** Alert: cały tekst (tytuł i treść) w `color-text-danger` (dosłownie P3), `radius-surface`, bez ikony; przycisk akcji drugorzędny.
- **C8.** Alert nie przenosi fokusu; ogłasza go `role="alert"`.
- **C9.** Zaznaczony segment różni się też grubością pisma (600 zamiast 400), nie tylko kolorem i tonem (WCAG 1.4.1).
- **C10.** Nazwa checkboxa w wierszu zadania: „Complete {tytuł}” / „Ukończ {tytuł}” (do potwierdzenia przy TaskRow w etapie 3).

## Etap 2, partia 3: co powstało (2026-10-22)

- **CLI:** `npx shadcn@4.22.1 add dropdown-menu popover tooltip` (tymczasowy `components.json` jak wcześniej); pakiet `cn` znowu odinstalowany. `add alert-dialog` zawisł na pytaniu o nadpisanie `button.tsx` (przerwany; Button bez zmian, sprawdzone z kopią), więc ConfirmDialog napisałem bezpośrednio na Radix AlertDialog. Plik `dropdown-menu.tsx` zastąpiony przez `menu.tsx`. Zależności: bez zmian poza planem.
- **Tokeny:** `color-scrim` w obu motywach (K2; `raw-scrim` z kodu R02), most `bg-scrim`. Wspólna klasa nakładek `overlay.ts`: ton wyniesiony, 1px `color-border-control`, `radius-surface`, bez cienia i animacji (K2).
- **Komponenty:** ConfirmDialog (alertdialog, fokus na Anuluj, Escape blokowany w trakcie usuwania, błąd w środku), Menu (Trigger, Content, Item z `tone="danger"`, CheckboxItem, Separator), Popover, Tooltip (tekst z `aria-label` przycisku), EmptyState i ErrorState w `src/components/` (spec E01: wspólne stany ładowania, pustki i błędu).
- **Zmiana po C7:** Alert ma wymagany `title` w kolorze błędu, treść w kolorze tekstu; stories i strona Alert poprawione.
- **Dokumentacja:** 6 stron po 13 sekcji i 40 stories; nakładki w dokumentacji renderowane w iframe, a test a11y obejmuje całe `body` (portale). Testy interakcji: dialog (fokus na Anuluj, pułapka Tab, Escape i powrót fokusu, potwierdzenie, blokada w trakcie), menu (Enter, Escape z powrotem fokusu, wybór pozycji), popover (otwarcie, `aria-expanded`, Escape), tooltip (pokazanie przy fokusie, brak `aria-describedby`), EmptyState (akcja klawiaturą), ErrorState (Enter ponawia, stan „Trying again…”). Kolejność prymitywów w menu Storybooka uzupełniona.
- **Testy jednostkowe:** 10 nowych (jsdom); `npm test` 134 testy, 100%.

### Partia 3: sprawdzenie (2026-10-22)

- `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów. `npm test`: 134 testy, 100% we wszystkich czterech miarach.
- `npm run test:storybook`: 296 testów (148 stories × 2 motywy), a11y = error; nakładki sprawdzane w całym `body`.
- `build-storybook` i `npm run build` (aplikacja, czysty `.next`, nowa klasa `max-w-overlay` jest w CSS): sukces. `npm run audit` (`--omit=dev --audit-level=high`): exit 0. Zgłasza 9 podatności moderate w narzędziach deweloperskich (vitest, esbuild, drizzle-kit), bez zmian.
- Zbudowany Storybook (agent-browser): wszystkie 25 stron docs renderują się (13 sekcji na każdej stronie prymitywu, tabele wyrenderowane, bez surowych `|`); dialog, menu i popover w obu motywach; 320px bez przewijania w poziomie.
- Poprawione po oglądzie:
  - `{title}` w tekście MDX łamało stronę Confirm dialog (MDX czyta to jako wyrażenie). Testy stories tego nie łapią, więc teraz przeglądam wszystkie strony docs w zbudowanym Storybooku.
  - Stories w iframe na stronach docs nie dostawały motywu z paska (zasada 9). `preview.tsx` przenosi teraz motyw strony docs do każdego iframe.
  - Radix zamyka menu, gdy okno traci fokus, więc stories z otwartym menu mają `open` na stałe.
  - Menu ignorowało `defaultChecked` w pozycji z checkboxem. Story trzyma teraz stan.
  - Na 320px menu wychodziło poza ekran. Nowe narzędzie `max-w-overlay` to mniejsza z dwóch wartości: miara tekstu albo dostępna szerokość minus dwa marginesy strony.
- Tooltip na stronie docs widać tylko w iframe, który ma fokus; pełny stan widać w widoku story.
- Nie sprawdzone: czytnik ekranu, Safari/iOS.

### Partia 3: propozycje D1–D10 (rozstrzygnięte przez product ownera 2026-10-22)

Przyjęte D2, D5–D10. D1: osobny token (wybór wartości zostawiony mnie, według zasad). D3 i D4: helper odczytujący tokeny. Wdrożenie niżej („Partia 3: wdrożenie decyzji D”).

- **D1.** Podświetlenie pozycji menu (mysz, strzałki): ton `color-surface-list` na wyniesionym panelu. Materiały milczą. W ciemnym motywie różnica jest słaba; z klawiatury widać też obrys fokusu. Alternatywa: nowy token tonu podświetlenia.
- **D2.** Tooltip bierze tekst z `aria-label` przycisku. Dymek ma `aria-hidden`, a przycisk nie dostaje `aria-describedby` (owijka `span`), więc czytnik czyta nazwę raz. Opóźnienie 700 ms (domyślne Radix); na dotyku tooltipa nie ma.
- **D3.** Odstęp nakładek od krawędzi ekranu: Radix przyjmuje `collisionPadding` tylko jako liczbę w JS, a nie token. Obecnie 0, więc na 320px menu lub tooltip może dotknąć krawędzi. Propozycja: mały helper, który odczytuje `space-page-gutter` w czasie działania. Alternatywa: zostawić.
- **D4.** Nakładki stoją tuż przy wyzwalaczu (bez `sideOffset`). Alternatywa: odstęp `space-inline` (ten sam problem liczby w JS co D3).
- **D5.** Kolejność przycisków w dialogu: najpierw „Delete task” (danger), potem „Cancel”; fokus startuje na Cancel. Na 320px przyciski stoją jeden pod drugim, potwierdzenie na górze.
- **D6.** Błąd w dialogu to akapit `role="alert"` w kolorze błędu nad przyciskami; dialog zostaje otwarty, żeby można było ponowić albo anulować.
- **D7.** EmptyState: bez ikony i ilustracji, wyrównany do lewej, akcja tylko wtedy, gdy następnego kroku nie ma już na ekranie.
- **D8.** ErrorState zbudowany na Alert (C7): tytuł w kolorze błędu, treść zwykła, przycisk drugorzędny „Try again” / „Trying again…”.
- **D9.** Menu: same słowa, bez ikon przy pozycjach (Luki 7); „Delete” zawsze ostatnie, po separatorze, w kolorze błędu. Znacznik pozycji z checkboxem stoi na początku wiersza.
- **D10.** ConfirmDialog napisany bezpośrednio na Radix AlertDialog, a nie przez CLI (CLI chciał nadpisać `button.tsx`).

### Partia 3: wdrożenie decyzji D (2026-10-22)

- **D1:** token `color-surface-raised-hover` (klasa `bg-raised-hover`), bez nowych wartości hex.
  - Ciemny: `neutral-800`. W kodzie R02 najechana pozycja menu jest o jeden ton wyżej niż panel (`.menu > button:hover` → `surface-2`).
  - Jasny: `neutral-0` (biały). Ciemniejszy krok (`neutral-200`) dawałby tekstowi błędu („Delete”) 4,09:1, poniżej WCAG 1.4.3.
  - Kontrast na podświetleniu (ciemny / jasny): tekst główny 10,31 / 16,51; tekst błędu 4,98 / 5,71; obrys fokusu 4,85 / 6,35. Różnica tonu względem panelu: 1,18 / 1,19.
  - Strona Color: nowa rola z parami kontrastu oraz brakująca dotąd rola `color-scrim`. Próbka zasłony pokazuje teraz przezroczystość („at 50%”).
- **D3, D4:** `src/lib/token-px.ts` czyta token długości z `:root` w pikselach (rem × rozmiar pisma korzenia). `overlayPlacement()` w `overlay.ts` daje Radix `sideOffset` = `space-inline` (4px) i `collisionPadding` = `space-page-gutter` (16px na telefonie, 24px od 640px).
  - Używają go menu, popover i tooltip.
  - `max-w-overlay` to teraz `min(miara tekstu, dostępna szerokość Radix)`, bo Radix sam odejmuje `collisionPadding`.
  - Na 320px menu i tooltip zostawiają po 16px z obu stron (zmierzone: 16–304px).
- Sprawdzenie:
  - `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów;
  - `npm test`: 139 testów, 100% we wszystkich miarach;
  - `test:storybook`: 296;
  - `build-storybook`, build aplikacji (czysty `.next`, klasa `bg-raised-hover` w CSS) i `audit`: sukces;
  - strona Color w obu motywach: nowe pary przechodzą.

## Etap 3, partia 1: co powstało (2026-10-22)

Etap 3 dzielę na partie według epików, jak etap 2: 1) logowanie i powłoka, 2) E01, 3) E02, 4) E03. Po każdej partii zatrzymuję się.

- **Standardy:** wyjątek P1 dopisany do `.ai/docs/engineering-standards.md` §5 (punkt 3): prezentacyjne komponenty produktu w `ui/src/product/<epik>/`.
- **Wzorzec formularza:** hook `useForm` (`src/lib/use-form.ts`):
  - walidacja po opuszczeniu pola, ale tylko po wpisaniu czegoś; komunikat znika, gdy wartość jest już poprawna;
  - przy wysłaniu walidacja całości i fokus na pierwszym błędzie, w tym samym renderze co komunikaty (`useLayoutEffect`);
  - dane zostają; drugie wysłanie jest blokowane; „gotowe” dopiero po potwierdzeniu serwera;
  - błędy pól z serwera trafiają pod pola, błąd ogólny do `Alert`.
- **Komponenty produktu** (`src/product/`, P1: propsy na wejściu, callbacki na wyjściu, teksty z domyślnymi wartościami EN i propem `text`):
  - `sign-in/`: AuthCard, SignInForm, SignUpForm, SignUpClosed;
  - `shell/`: ThemeToggle, AppHeader (z obsługą nieudanego wylogowania), AppShell.
- **„use client”** dodane w Input, PasswordInput i FormField (używają hooków; bez tego aplikacja nie mogłaby ich użyć z Server Component).
- **Storybook:**
  - 6 stron komponentów po 13 sekcji;
  - Patterns/Form: reguły ze źródłami i 8 stanów jako osobne stories;
  - 2 strony ekranów z mapą stanów: S1–S3 (Sign-in / Screens) i S4 (App shell / Screens), w 320/768/1440;
  - symulacja API w `.storybook/blocks/fake-api.ts` (P1, bez MSW), z komunikatami ze speca logowania;
  - przełącznik motywu w ekranach steruje motywem Storybooka (zasada 9).
- **Testy jednostkowe:** 19 nowych; `npm test` 158 testów, 100%.

### Partia 1: sprawdzenie (2026-10-22)

- `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów. `npm test`: 158, 100% we wszystkich miarach.
- `test:storybook`: 396 (198 stories × 2 motywy), a11y = error.
- `build-storybook`, build aplikacji (czysty `.next`), `audit`: sukces. Bez nowych zależności; kod aplikacji bez zmian.
- Zbudowany Storybook (agent-browser):
  - 9 nowych stron docs renderuje się;
  - ekrany S1, S2 i S4 w 320/768/1440 w obu motywach, bez przewijania w poziomie;
  - przełącznik motywu zmienia motyw podglądu i paska narzędzi.
- Poprawione po testach i oglądzie:
  - fokus na polu z błędem serwera przychodził za późno (`useEffect` po malowaniu) → `useLayoutEffect`;
  - komunikat nieudanego wylogowania stał nad linią paska → linia jest teraz pod samym paskiem.
- Nie sprawdzone: czytnik ekranu, Safari/iOS.

### Partia 1: propozycje E1–E12 (rozstrzygnięte przez product ownera 2026-10-22)

E1: bez dolnej nawigacji w wersji 1. E11: dodać link „Sign in” na stronie rejestracji (zrobione: `SignUpForm` ma wymagany `signInHref`). Pozostałe przyjęte.

- **E1.** Bez dolnej nawigacji na telefonie w wersji 1. P07 mówi „tyle pozycji, ile miejsc ma wersja 1”, a wersja 1 ma jeden ekran (lista z linią przyszłych wydatków), więc pasek z jedną pozycją nic nie daje. Wraca, gdy dojdzie drugi ekran.
- **E2.** Walidacja po opuszczeniu pola tylko wtedy, gdy użytkownik coś wpisał (przejście Tabem przez puste pole nie pokazuje błędu); pokazany błąd znika, gdy wartość staje się poprawna.
- **E3.** Treści błędów pól logowania i rejestracji w stories to przykłady („Enter your email address.”, „Use at least 10 characters.”). Spec ustala tylko podpowiedź hasła, a prawdziwe komunikaty przyjdą ze schematów `signInInput` / `signUpInput`.
- **E4.** Po sukcesie przycisk zostaje zajęty („Signing in…”, „Creating account…”), aż aplikacja zmieni stronę; ponowne wysłanie jest niemożliwe.
- **E5.** Przycisk wysyłania na całą szerokość poniżej 640px, od 640px szeroki jak tekst, wyrównany do lewej.
- **E6.** Karta logowania: wyśrodkowana w poziomie, u góry strony (`space-page-top`), nie na środku w pionie (klawiatura telefonu nie przesuwa formularza). Nazwa „Taskly” nad kartą jako zwykły tekst; szerokość karty `layout-text-measure`.
- **E7.** Błąd wylogowania jako `Alert` pod paskiem, na szerokość kolumny.
- **E8.** Przełącznik motywu poniżej 640px pokazuje same ikony (R02.11: „górny pasek zwęża się do nazwy i ikon”); słowa zostają nazwami dla czytnika.
- **E9.** Linki między logowaniem i rejestracją to zwykłe `<a href>` (komponenty nie znają routera Next); przejście przeładowuje stronę, co przy dwóch stronach serwerowych nie przeszkadza.
- **E10.** Osobny SignOutButton z planu połączony z AppHeader; przycisk „Sign out” (ghost) w trakcie pokazuje spinner, ale nie zmienia tekstu, żeby pasek mieścił się na 320px.
- **E11.** Strona rejestracji (otwartej) nie ma linku „Sign in”, bo spec go nie wymienia. Dodać?
- **E12.** Treść pod paskiem i sam pasek mają tę samą szerokość kolumny (980px), więc nazwa i „Sign out” stoją w jednej linii z listą.

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

| Id  | Ekran                                                                                                                                                                                               | Źródło                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| S1  | `/sign-in`: e-mail, hasło z przełącznikiem widoczności, „Sign in”, link „Create an account” gdy rejestracja otwarta, błędy nad formularzem                                                          | spec logowania, UI/UX                                |
| S2  | `/sign-up` otwarta: imię, e-mail, hasło z podpowiedzią „At least 10 characters”, „Create account”                                                                                                   | spec logowania                                       |
| S3  | `/sign-up` zamknięta: komunikat i link do logowania                                                                                                                                                 | spec logowania                                       |
| S4  | Pasek górny: nazwa, przełącznik motywu, „Sign out” z błędem wylogowania; na telefonie dolna nawigacja (lista, przyszłe wydatki)                                                                     | spec logowania (AppHeader), P01, P07, R02.11, Luki 2 |
| S5  | `/` lista zadań: szybkie dodawanie (+ „Details”: opis, min, max), wiersze z podzadaniami, edycja w wierszu, potwierdzenie usunięcia, ładowanie / pusto / błąd, wiersz oczekujący, błąd po wycofaniu | spec E01, UI/UX i Edge cases; R02.1, R02.9           |
| S6  | Wiersz rozwinięty (szczegóły zadania w miejscu)                                                                                                                                                     | Q2, Luki 6                                           |
| S7  | Kolejność, markery, miejsca na liście (przeciąganie, „Ważne”/„Pilne”, przypisanie do kilku miejsc)                                                                                                  | backlog E02-S01…S03 (bez speca), decyzja 2026-10-21  |
| S8  | Ukończenie i ponowne otwarcie; przyszłe wydatki (linia sumy + zwinięte zadania bez szacunku)                                                                                                        | backlog E03-S01, E03-S02 (bez speca), Luki 9–10      |

E02 i E03 nie mają specyfikacji; ich komponenty wyprowadzam z backlogu, `reference.md` i `tokeny.md`. Otwarte w backlogu: jak powstają miejsca i jak mają się do list (wpływa na wybór miejsc i barwy).

## Komponenty bazowe (plan)

| Komponent                                                             | Ekrany         | Uwagi                                                                                         |
| --------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| Button (główny, drugorzędny, tekstowy; rozmiar ikony; stan ładowania) | S1–S5, S8      | „Sign in”, „Add”, „Save”, „Try again”, „Delete task”; spinner przy wysyłaniu (spec logowania) |
| Link i TextAction                                                     | S1–S3, S5, S8  | „Create an account”; „Dodaj szacunek”; tekst zachęty pustego pola (R01.4)                     |
| Input (z przyrostkiem „zł”, `inputmode="decimal"`)                    | S1, S2, S5     | kwoty min/max (spec E01)                                                                      |
| PasswordInput (przycisk pokaż/ukryj, `aria-pressed`)                  | S1, S2         | spec logowania Q10                                                                            |
| Textarea                                                              | S5, S6         | opis zadania                                                                                  |
| Checkbox                                                              | S5, S7, S8     | ukończenie (20px, cel 44px na telefonie), markery, wybór miejsc                               |
| Label + FormField (etykieta, podpowiedź, błąd, wymagane/opcjonalne)   | S1, S2, S5     | `aria-describedby` (spec E01, spec logowania)                                                 |
| Surface (powierzchnia listy / karta logowania)                        | S1–S3, S5, S8  | `radius-surface`, bez cienia                                                                  |
| Alert (błąd, `role="alert"`)                                          | S1, S2, S4, S5 | `color-surface-raised` + `color-text-danger` (P3)                                             |
| ConfirmDialog (AlertDialog)                                           | S5             | usuwanie zadania                                                                              |
| Menu (DropdownMenu, „…”)                                              | S5–S7          | dodaj podzadanie, edytuj, usuń, markery                                                       |
| Popover                                                               | S7             | wybór miejsc, wybór barwy miejsca                                                             |
| Tooltip                                                               | S5, S7         | tylko jako dodatkowy podpis ikon; nazwa w `aria-label` (P4)                                   |
| Collapsible (rozwijanie)                                              | S5, S6, S8     | „Details”, rozwinięcie wiersza, „N bez szacunku”                                              |
| RadioGroup / przełącznik segmentowy                                   | S4             | przełącznik motywu (P4)                                                                       |
| Skeleton (statyczny)                                                  | S5, S8         | Luki 8                                                                                        |
| EmptyState                                                            | S5, S8         | „No tasks yet. Add the first thing you need to do.”                                           |
| ErrorState (komunikat + „Try again”)                                  | S5, S8         | spec E01                                                                                      |

Do „What is missing” (P4): Avatar, Tabs, Toast, StatusBadge, Select, Switch, zwykły Dialog.

## Komponenty produktu (plan; miejsce według P1)

| Epik                    | Komponent                                                                            | Ekrany |
| ----------------------- | ------------------------------------------------------------------------------------ | ------ |
| Prerekwizyt (logowanie) | SignInForm, SignUpForm, SignUpClosed, SignOutButton (stan błędu)                     | S1–S4  |
| Powłoka                 | AppHeader, BottomNav (telefon), ThemeToggle, PageColumn (`layout-content-max-width`) | S4     |
| E01                     | QuickAdd (tytuł + „Add” + „Details”)                                                 | S5     |
| E01                     | TaskRow (2 linie, poziom zagnieżdżenia, oczekujący, rozwinięty)                      | S5, S6 |
| E01                     | TaskList (powierzchnia, zagnieżdżone `ul`)                                           | S5     |
| E01                     | TaskForm (edycja w wierszu: tytuł, opis, min, max)                                   | S5, S6 |
| E01                     | EstimateRange („1 200–1 500 zł” / „No estimate”)                                     | S5, S8 |
| E01                     | DeleteTaskDialog (nazwa i liczba podzadań)                                           | S5     |
| E02                     | DragHandle (+ przenoszenie klawiaturą)                                               | S7     |
| E02                     | Markers („Ważne”, „Pilne” jako tekst)                                                | S7     |
| E02                     | PlaceTag (kropka + nazwa)                                                            | S5, S7 |
| E02                     | PlacePicker (wiele miejsc), PlaceColorPicker (10 barw, zajęte wyłączone)             | S7     |
| E03                     | TaskCheckbox (ukończ / otwórz ponownie)                                              | S8     |
| E03                     | SubtaskProgress („1/3”)                                                              | S5, S8 |
| E03                     | FutureExpenses (linia sumy, zasada jednym zdaniem)                                   | S8     |
| E03                     | UnestimatedTasks (zwinięta linia + lista z „Dodaj szacunek”)                         | S8     |

## Wzorce (plan)

| Wzorzec                       | Ekrany     | Stany                                                                                                                                                                                |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Form                          | S1, S2, S5 | pusty, walidacja po opuszczeniu pola i przy wysłaniu, fokus na pierwszym błędzie, oczekiwanie (blokada podwójnego wysłania), sukces po serwerze, błąd pola, błąd serwera, brak sieci |
| List (pusto vs. brak wyników) | S5         | ładowanie, „jeszcze nic tu nie ma” z akcją dodania, błąd, dużo danych, długie teksty. Bez filtrów (P4)                                                                               |
| Details in row                | S6         | zwinięty, rozwinięty, „zadanie już nie istnieje albo brak dostępu” (404 w spec E01)                                                                                                  |
| Delete confirmation           | S5         | z podzadaniami i bez, oczekiwanie, błąd                                                                                                                                              |
| Quick capture                 | S5         | tytuł → Enter, fokus zostaje, nowy wiersz na końcu                                                                                                                                   |
| Inline edit                   | S5, S6     | edycja, błąd pola, anulowanie                                                                                                                                                        |
| Optimistic change             | S5         | wiersz oczekujący z wyłączonymi akcjami, wycofanie z błędem w wierszu                                                                                                                |
| Reorder                       | S7         | przeciąganie, klawiatura, ukończone nieprzeciągalne                                                                                                                                  |
| Complete and reopen           | S8         | ukończone na końcu, ponownie otwarte na początku, kaskada na podzadania                                                                                                              |

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

| Element                                                                        | Propozycja                                                                 | Uzasadnienie                                                                                                                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/package.json`, `src/index.ts`                                     | zostaje, rozszerzam (eksporty, skrypty, zależności)                        | to jest docelowe miejsce systemu (AGENTS.md, standardy §5)                                                                                               |
| `packages/app/app/globals.css` (zmienne startowe Next, `prefers-color-scheme`) | zrobione (commit 5e92a12): aplikacja importuje `@taskly/ui/styles.css`     | kod aplikacji poza katalogiem systemu (zasada 11); motyw z systemu operacyjnego jest sprzeczny z Q1 i Luki 2, więc przy podpięciu do usunięcia, za zgodą |
| Font Geist w `packages/app/app/layout.tsx`                                     | zrobione (commit 5e92a12): Geist usunięty, Instrument Sans z systemu       | Q4, Luki 1                                                                                                                                               |
| Reguła standardów §5 („concept-specific → app”)                                | zrobione: wyjątek P1 w standardach §5                                      | miejsce komponentów produktu                                                                                                                             |
| Spec E01, UI/UX (opis w wierszu, akcje w wierszu)                              | poprawić według Luki 6 i R02.1 (P2 przyjęte); do zrobienia osobno          | konflikt z Luki 6, R02.1                                                                                                                                 |

Niczego nie usuwam.

## Sprawy do zrobienia poza design systemem

- ~~Dopisać wyjątek P1 do `.ai/docs/engineering-standards.md` §5~~ (zrobione w etapie 3).
- Poprawić UI/UX w `.ai/specs/2026-10-16-tasks-and-subtasks.md` według P2 (opis po rozwinięciu, akcje w „…”); termin do ustalenia.

## Notatka techniczna

Baza komponentów: shadcn/ui (kod kopiowany do `src/components/ui`) na Radix, ikony Lucide. W interfejsie Storybooka widać tylko nazwę „Taskly”.

Dodawanie kolejnych prymitywów: tymczasowy `components.json` w `packages/ui` (`style: new-york`, `tailwind.css` wskazuje plik roboczy, aliasy `@/…` z tymczasowymi `paths` w `tsconfig.json`), `npx shadcn@4.22.1 add …`, potem sprawdzić `package.json` (CLI potrafi dodać pakiet spoza planu), usunąć pliki tymczasowe i przepisać kod na importy względne i tokeny.

### Partia 2 (E01): decyzja o rozwijaniu wiersza (product owner, 2026-10-22)

Wariant 2: zwinięty wiersz pokazuje tylko zadanie (tytuł, kwota, linia meta). Strzałka na początku wiersza odsłania razem opis, podzadania i widoczne „Add subtask”.

### Partia 2 (E01): zrobione

- **Fundamenty:** token `motion-duration-highlight` 1200ms (0 przy ograniczonym ruchu) i narzędzie `row-highlight` (F1); `useForm` z opcją `resetOnSuccess` (szybkie dodawanie); `ConfirmDialog` z `onCloseAutoFocus`.
- **Komponenty** w `src/product/tasks/` (P1, wszystkie teksty w jednym `TaskText` z angielskimi wartościami domyślnymi):
  - EstimateRange („1 200–1 500 zł” / „No estimate”);
  - QuickAdd (tytuł + „Add”, „Details” z opisem i min/max; wariant podzadania z Cancel i Escape);
  - TaskForm (edycja w miejscu wiersza, Save/Cancel, Escape);
  - TaskRow (wariant 2; menu „…”: Add subtask, Edit, Delete; oczekujący, błąd po wycofaniu, podświetlenie nowego);
  - TaskList (ładowanie, błąd z „Try again”, pusto, lista; jeden dialog usuwania; fokus po usunięciu);
  - DeleteTaskDialog (pytanie z liczbą podzadań, usuwanie, błąd w środku).
- **Storybook:**
  - 6 stron komponentów po 13 sekcji (Product/Tasks);
  - 6 wzorców: List (z wyjaśnieniem „pusto” kontra „brak wyników”), Details in row (ze stanem „nie istnieje / brak dostępu”), Quick capture, Inline edit, Delete confirmation, Optimistic change;
  - ekrany S5–S6 z mapą stanów (15 stories, 320/768/1440), z symulacją serwera w `.storybook/blocks/TaskScreen.tsx` (potwierdza, odmawia albo nie odpowiada);
  - przykładowe dane remontu i polskie teksty w `.storybook/blocks/task-data.ts`.
- **Testy jednostkowe:** 27 nowych (useForm reset, ConfirmDialog fokus, komponenty zadań).

### Partia 2 (E01): sprawdzenie (2026-10-22)

- `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów. `npm test`: 185, 100% we wszystkich miarach.
- `test:storybook`: 618 (309 stories × 2 motywy), a11y = error; po ostatniej poprawce odstępu ponownie stories zadań i wzorców (238).
- `build-storybook`, build aplikacji (czysty `.next`), `audit` (bramka `--omit=dev --audit-level=high`): sukces. Pełny `npm audit` pokazuje nowe zgłoszenia w narzędziach deweloperskich (vitest 5.0.x, esbuild w drizzle-kit, braces); nie ruszam zależności bez zgody.
- Bez nowych zależności; kod aplikacji bez zmian.
- Zbudowany Storybook (agent-browser):
  - 14 stron docs (6 komponentów, ekrany, 7 wzorców) renderuje się, tabele działają;
  - ekrany S5–S6 w 320/768/1440 w obu motywach, bez przewijania w poziomie.
- Poprawione po testach i oglądzie:
  - `{title}` w prozie MDX psuło 2 strony → w backtickach;
  - pierścień fokusu strzałki dotykał tytułu → odstęp `space-group`;
  - zapytanie regexem w teście łapało też przycisk „More actions for …”.
- Nie sprawdzone: czytnik ekranu, Safari/iOS.

### Partia 2 (E01): propozycje F1–F14 (rozstrzygnięte przez product ownera 2026-10-22)

F2 przyjęte. F7: alternatywa — formularz podzadania zamyka się po każdym potwierdzonym dodaniu, fokus wraca na „Add subtask” (zrobione). F11: zapisane jako uwaga w specu E01 (UI/UX, Task row). Pozostałe przyjęte; w dokumentacji „proposal F” zmienione na „decision F”.

- **F1. Podświetlenie nowego wiersza.** Spec: „briefly highlighted”, bez czasu. Propozycja: tło `color-surface-raised` gaśnie przez 1200ms (nowy token `motion-duration-highlight`, wzorem połysku 1,2s z R02.12); przy ograniczonym ruchu 0.
- **F2. Formularze czekają na serwer.** Spec: dodanie pokazuje od razu tymczasowy wiersz. Propozycja: wiersz pojawia się od razu („Saving…”), ale pole szybkiego dodawania czyści się, a formularz edycji zamyka dopiero po potwierdzeniu. Odmowa zostawia wpisany tekst i komunikat na formularzu.
- **F3. „Saving…” w linii meta** wiersza oczekującego, żeby wyłączone akcje miały widoczny powód.
- **F4. „3 subtasks” w linii meta** zwiniętego zadania, dopóki E03 nie wprowadzi „1/3” (inaczej po zwinięciu nie widać, że zadanie ma podzadania).
- **F5. Strzałka przy podzadaniu tylko wtedy, gdy ma opis.** Bez opisu nie ma czego rozwijać; tytuł i tak stoi w tej samej kolumnie.
- **F6. Fokus:** po zapisie lub anulowaniu edycji wraca na „…” wiersza; po usunięciu przechodzi na listę (wiersza już nie ma); po anulowaniu usuwania wraca na „…” (spec).
- **F7. Formularz podzadania zostaje otwarty** po dodaniu, gotowy na następne podzadanie (jak szybkie dodawanie); zamyka go Cancel lub Escape. Pola opisu i kwot też pod „Details”.
- **F8. Kwota pod tytułem poniżej 640px,** od 640px po prawej (R02.5). Na 320px tytuł i kwota obok siebie nie mieszczą się bez łamania kwoty.
- **F9. „Details” nie zamyka się,** dopóki pole w środku ma błąd; błąd z serwera w zamkniętym „Details” sam je otwiera.
- **F10. Wygląd rozwiniętego zadania:** całe zadanie na `color-surface-raised`; opis zwykłym kolorem tekstu, szerokość `layout-text-measure`; wiersze podzadań w środku podświetlane `color-surface-raised-hover`.
- **F11. Rozbieżność w kodzie aplikacji (do poprawy w E01, nie w design systemie):** `formatPlnRange` w `packages/core/src/money.ts` daje „1200,00 zł – 1500,00 zł”, a zasada 5 tokenów i spec wymagają „1 200–1 500 zł” (grupowanie tysięcy przez `pl-PL` zaczyna się od 5 cyfr, zawsze dwa miejsca po przecinku, spacje wokół półpauzy). Kodu aplikacji nie zmieniam (zasada 11).
- **F12. Komunikat „nie istnieje / brak dostępu”:** „This task no longer exists. It may have been deleted in another tab.”, po czym aplikacja odświeża listę. Serwer zwraca 404 w obu przypadkach, więc ekran ich nie rozróżnia.
- **F13. Przykładowe komunikaty** spoza speca (jak E3): „Enter a title.”, „Enter at most 10 000 000 zł”, „Could not add the task. Try again.”, „Could not save the task. Try again.”, „Could not delete the task. Try again.”, „Could not load your tasks.”. Prawdziwe przyjdą ze schematów i aplikacji.
- **F14. Polskie teksty** komponentów E01 w story „Polish” (np. „Nowe zadanie”, „Szczegóły”, „Bez szacunku”, „Usunąć „…” i 3 podzadania?”) to propozycja; odmiana liczby podzadań przez `Intl.PluralRules`.

### Partia 3 (E02): pytania G1–G6 przed budową (2026-10-22)

E02 nie ma speca; źródła: backlog (#17–#19), decyzja o ukończonych zadaniach (2026-10-21), `tokeny.md` (miejsca, markery), Luki 3, 4, 6, kod R02 (menu „Move up/Move down”, wybór etykiet z polem „New label”). Rozstrzygnięte przez product ownera 2026-10-22:

- **G1.** Podzadania też można przestawiać, ale tylko w obrębie swojego zadania.
- **G2.** Poniżej 640px bez uchwytu: kolejność zmienia się tylko przez przytrzymanie wiersza albo „Move up / Move down” w menu. Od 640px widoczny uchwyt.
- **G3.** Markery i miejsca w menu „…”: pola wyboru „Important”, „Urgent” i „Places…” otwierające wybór miejsc.
- **G4.** W wyborze miejsc pole „New place” i „Create”; pierwsze sześć miejsc dostaje barwy automatycznie, od siódmego wybór jednej z wolnych barw (pierwsza wolna zaznaczona); nazwa niepusta, najwyżej 30 znaków, bez powtórzeń.
- **G5.** Najwyżej 10 miejsc; przy próbie dodania kolejnego komunikat.
- **G6.** „Edit places”: zmiana barwy (wolne + własna), zmiana nazwy i usunięcie.

### Partia 3 (E02): zrobione (2026-10-22)

- **Komponenty** (P1, teksty w `TaskText` i nowym `PlaceText`):
  - `src/product/tasks/`: DragHandle (uchwyt, `data-drag-handle`), Markers (słowa „Important”, „Urgent”), `sortable.tsx` (SortableGroup na dnd-kit: mysz i klawiatura tylko z uchwytu, przytrzymanie na dotyku, ruch tylko w pionie, komunikaty dla czytnika; `moveTarget`, `stepTarget`, `rowMove` dają `{afterId, beforeId}`);
  - `src/product/places/`: PlaceTag (kropka + nazwa), PlaceColorPicker (10 barw, zajęte wyłączone z „used by …”), PlacePicker (wybór, „New place” + „Create”, kolor od siódmego, limit 10, „Edit places” z nazwą, kolorem i usuwaniem);
  - TaskRow: uchwyt od 640px, przytrzymanie wiersza, menu w grupach (Add subtask, Edit, Places… | Important, Urgent | Move up, Move down | Delete), popover miejsc przy „…”, linia meta z miejscami i markerami, osobna grupa sortowania podzadań (G1); wiersze oczekujące nie biorą udziału w przesuwaniu;
  - TaskList: grupa sortowania zadań, przekazuje `onMove`, `onToggleMarker`, `places`;
  - prymityw Popover: `PopoverAnchor`; narzędzie CSS `swatch-selected`.
- **Zależności:** `@dnd-kit/core` 6.3.1 i `@dnd-kit/sortable` 10.0.0 (z planu technicznego); innych nie dodałem.
- **Storybook:**
  - strony po 13 sekcji: Product/Tasks › Drag handle, Markers; Product/Places › Place picker, Place tag, Place color picker; Task row i Task list uzupełnione o stany E02;
  - wzorzec Patterns/Reorder (8 stanów, reguły ze źródłami, tabela klawiszy);
  - ekran S7 w Product/Tasks/Screens (11 stories, mapa stanów); `TaskScreen` symuluje przesuwanie, markery i miejsca (od razu, z wycofaniem i komunikatem w wierszu);
  - dane: `.storybook/blocks/place-data.ts` (miejsca, reguła nazwy G4, polskie teksty), `organizedTasks`, `polishOrganizedTasks`, bloki `PlacePickerDemo`, `OrderDemo`.
- **Testy jednostkowe:** `places.test.tsx`, `sortable.test.tsx`, nowe testy wiersza i listy, `PopoverAnchor`.

### Partia 3 (E02): sprawdzenie (2026-10-22)

- `format:check`, `lint`, `typecheck`, `check:tokens`: bez błędów. `npm test`: 224, 100% we wszystkich miarach.
- `test:storybook`: 746 (373 stories × 2 motywy), a11y = error; po poprawce danych miejsc ponownie stories produktu i wzorca Reorder (380).
- `build-storybook`, build aplikacji, `audit` (bramka `--omit=dev --audit-level=high`): sukces. Kod aplikacji bez zmian.
- Zbudowany Storybook (agent-browser): 9 nowych lub zmienionych stron docs renderuje się (13 sekcji, tabele GFM, `\|` w tabeli API); S7 w 320/768/1440 w obu motywach, popover miejsc na 320 i 1440, cofnięte przesunięcie, menu; bez przewijania w poziomie.
- Poprawione po testach i oglądzie:
  - `PopoverAnchor` wymaga `Popover` także bez miejsc → korzeń `Popover` zawsze, treść tylko z `places`;
  - story kończące się w trakcie przeciągania zostawiało nasłuch klawiatury dnd-kit i „zjadało” spację w następnym story → story kończą przeciąganie klawiszem Escape (lekcja);
  - „Living room” był w zadaniach, a nie w miejscach listy → nowe miejsce dostawało tę samą barwę; dane poprawione;
  - przykład „Don't” z `#4f86b8` łamał zasadę 3 → bez wartości.
- Nie sprawdzone: czytnik ekranu, Safari/iOS, prawdziwe przytrzymanie palcem (tylko emulacja w kodzie dnd-kit).

### Partia 3 (E02): propozycje H1–H10 (wszystkie przyjęte przez product ownera 2026-10-22)

W dokumentacji „proposal H” zmienione na „decision H”.

- **H1. Przytrzymanie na dotyku:** 250 ms i tolerancja 5 px (wartości z dokumentacji dnd-kit); krótkie dotknięcie i przewijanie działają jak zwykle.
- **H2. Usuwanie miejsca:** potwierdzenie w miejscu, w samym wyborze miejsc („Delete “Hall”? It is removed from every task.” + Delete place / Cancel), nie w osobnym oknie nad popoverem.
- **H3. Nowe miejsce** od razu przypisane do zadania, z którego je utworzono; pole czyści się i zostaje w nim fokus.
- **H4. `PopoverAnchor`** dodany do prymitywu Popover: popover miejsc otwiera się z pozycji menu, więc przyczepia się do „…”.
- **H5. Komunikaty wycofania w wierszu:** „Could not move “X”. It is back where it was.” oraz dla markerów i miejsc „Could not save “X”. It is back as it was.”.
- **H6. Teksty:** „Move “X””, opis roli „movable row”, instrukcja klawiatury i komunikaty (picked up / moved over / dropped / cancelled), „Places for “X””, „Back to choosing”, „Delete place”, przykładowe komunikaty nazwy („Enter a name.”, „Use at most 30 characters.”, „A place with this name already exists.”); polskie wersje w stories „Polish” (np. „Przesuń w górę”, „Miejsca…”, „Nowe miejsce”, „Wróć do wyboru”, nazwy barw po polsku).
- **H7. Menu i popover:** grupy oddzielone liniami: [Add subtask, Edit, Places…] | [Important, Urgent] | [Move up, Move down] | [Delete]; popover miejsc wyrównany do prawej krawędzi „…”.
- **H8. Podniesiony wiersz:** tło `color-surface-raised` i nad innymi wierszami, bez cienia i bez powiększenia; pozostałe wiersze przesuwają się przez `motion-duration-quick` (150 ms, Luki 8).
- **H9. Wybrana barwa:** obwódka w kolorze tekstu wokół kropki (`swatch-selected`); zajęta barwa wyblakła (`opacity-disabled`) i nazwana „Blue, used by Bathroom”.
- **H10. Miejsce w Storybooku:** Drag handle i Markers w Product/Tasks, komponenty miejsc w nowym Product/Places (zamiast osobnego węzła „E02” z planu drzewa; E01 też trafił do Product/Tasks).

### Partia 4 (E03): pytania I1–I4 przed budową (2026-10-22; wszystkie propozycje przyjęte przez product ownera)

E03 nie ma speca. Już rozstrzygnięte, nie pytam:
- ukończone na końcu listy i bez przeciągania (decyzja 2026-10-21);
- wygląd ukończonego: checkbox w kolorze akcentu, tytuł wyciszony i przekreślony (R02.2, `tokeny.md`);
- kolejność w wierszu: uchwyt, strzałka, checkbox (R02.1, T7);
- „1/3” w linii meta (Luki 6);
- przyszłe wydatki jako jedna linia z przedziałem (R02.7, R08, P04);
- zwinięta linia „3 zadania bez szacunku” z „Dodaj szacunek” (Luki 9);
- kaskada R09, podzadanie kończone osobno, ponowne otwarcie zadania nie otwiera podzadań (R11);
- 200 ms na przeniesienie ukończonego (Luki 8).

Pytania:
- **I1.** Gdzie stoi linia przyszłych wydatków (z linią „bez szacunku” pod nią)? Propozycja: pod nazwą listy, nad szybkim dodawaniem.
- **I2.** Ukończenie zadania z otwartymi podzadaniami (R09). Ponowne otwarcie nie przywraca podzadań (R11), więc pomyłki nie da się cofnąć. Propozycja: pytanie tylko wtedy, gdy są otwarte podzadania („Complete “X” and its 2 open subtasks?”). Bez nich ukończenie od razu.
- **I3.** Co zostaje w ukończonym wierszu? Propozycja:
  - kwota, miejsca i markery wyciszone, kwota bez przekreślenia;
  - bez uchwytu i bez „Move up / Move down”;
  - w menu Edit, Places…, markery, Delete;
  - bez „Add subtask” przy ukończonym zadaniu.
- **I4.** Co robi „Add estimate” na liście zadań bez szacunku? Propozycja: w tym samym miejscu otwiera się mały formularz z polami Min i Max (Save / Cancel). Po zapisie zadanie znika z listy, a suma się zmienia. Alternatywa: przewinięcie do zadania na liście i otwarcie pełnej edycji.

### Partia 4 (E03): zrobione (2026-10-22)

- **Komponenty** (P1, teksty w `TaskText` i nowym `ExpensesText`):
  - `src/product/tasks/`: TaskCheckbox (`Checkbox` z nazwą „Complete “X””), SubtaskProgress („1/3”, czytane słowami), CompleteTaskDialog (na `ConfirmDialog`, przycisk primary);
  - `src/product/expenses/`: FutureExpenses (linia sumy jako `role="status"`, ładowanie, błąd z „Try again”), UnestimatedTasks (zwinięta linia, reguła, „Add estimate” z formularzem Min/Max w miejscu);
  - TaskRow: checkbox po strzałce, ukończony wiersz wyciszony i przekreślony (kwota bez przekreślenia), bez uchwytu, „Move up / Move down” i „Add subtask” (I3), „1/3” w linii meta;
  - TaskList: pytanie przed ukończeniem z otwartymi podzadaniami (I2), animacja przesunięcia wiersza (FLIP, `motion-duration-base` = 200 ms, 0 przy ograniczonym ruchu), fokus zostaje na checkboxie;
  - `src/lib/use-move-animation.ts`; prymityw ConfirmDialog: `confirmVariant` (`danger` domyślnie, `primary`).
- **Zależności:** bez nowych.
- **Storybook:**
  - strony po 13 sekcji: Product/Tasks › Task checkbox, Subtask progress, Complete task dialog; nowy Product/Expenses › Future expenses, Unestimated tasks; Task row, Task list i Confirm dialog uzupełnione o E03;
  - wzorzec Patterns/Complete and reopen (9 stanów, reguły ze źródłami);
  - ekran S8 w Product/Tasks/Screens (12 stories, mapa stanów); `TaskScreen` z `expenses` symuluje ukończenie (kaskada R09, ponowne otwarcie na początek, kolejność wyświetlania: otwarte, potem ukończone), sumę przyszłych wydatków i dodawanie szacunku, z wycofaniem;
  - dane: `progressTasks`, `doneTasks`, `polishProgressTasks`, `futureExpenses`, `validateEstimate`, polskie teksty E03 w `task-data.ts`.
- **Testy jednostkowe:** `expenses.test.tsx`, `use-move-animation.test.tsx`, nowe testy wiersza, listy, `stepTarget` i `confirmVariant`.

### Partia 4 (E03): sprawdzenie (2026-10-22)

- `format:check`, `lint`, `typecheck`, `check:tokens`: bez błędów. `npm test`: 249, 100% we wszystkich miarach.
- `test:storybook`: 882 (441 stories × 2 motywy), a11y = error.
- `build-storybook`, build aplikacji, `npm run audit` (bramka `--omit=dev --audit-level=high`): sukces. Kod aplikacji bez zmian.
- Pełne `npm audit` pokazuje nowe zgłoszenia tylko w narzędziach deweloperskich: vitest 5.0.x (moderate, `server.fs.deny`) i `braces` przez `eslint-config-next` (high). Nie aktualizowałem (zasada 6, zależności tylko za zgodą).
- Zbudowany Storybook (agent-browser): 10 nowych lub zmienionych stron docs renderuje się (13 sekcji, tabele GFM); S8 na 1440 w obu motywach, na 320 formularz szacunku, pytanie o podzadania, polskie teksty; bez przewijania w poziomie.
- Poprawione po testach i oglądzie:
  - `{title}` w zwykłym tekście MDX wyłożył trzy strony („title is not defined”) → w znacznikach kodu (ta sama pułapka co w partii 2 etapu 2);
  - suma z `whitespace-nowrap` mogła wyjść poza 320px przy bardzo długim przedziale → bez tego; liczby trzyma razem twarda spacja, łamanie tylko po myślniku;
  - dwa oczekiwania w stories były błędne (ukończone podzadania idą w kolejności planu, nie ukończenia; przycisk w trakcie zapisu ma `aria-disabled`).
- Nie sprawdzone: czytnik ekranu, Safari/iOS.

### Partia 4 (E03): propozycje J1–J10 (rozstrzygnięte przez product ownera 2026-10-22: J1 wariant C, J2–J10 przyjęte)

- **J1. Szerokość tytułu na 320px (decyzja potrzebna).** Checkbox (cel 44px + odstęp 8px) zmniejsza miejsce na tytuł ze 150 do 98px; polskie tytuły łamią się na 4 linie. Warianty:
  - A: zostawić;
  - B: poniżej 640px bez odstępu między strzałką a checkboxem i mniejszy odstęp wiersza (`space-group` zamiast `space-inset`), około 122px;
  - C (rekomendacja): poniżej 640px bez strzałki; tytuł sam jest przyciskiem rozwijania (ta sama nazwa i `aria-expanded`), około 150px. Zmienia wygląd z decyzji F5 tylko na telefonie.
- **J2. Brak sumy:** „No estimates yet” / „Brak szacunków”, także gdy wszystko ukończone.
- **J3. ConfirmDialog `confirmVariant="primary"`:** pytanie o ukończenie nie jest niebezpieczne, więc przycisk główny, nie czerwony; `danger` zostaje domyślny.
- **J4. Linia sumy jako `role="status"`:** nowa suma czytana raz po zmianie; po dodaniu ostatniego szacunku fokus przechodzi na linię sumy.
- **J5. „1/3” czytane słowami:** „1 of 3 subtasks completed”; po polsku „Ukończone podzadania: 2 z 5” (bez odmiany po „z”).
- **J6. Błąd przyszłych wydatków w linii:** komunikat w `color-text-danger` i „Try again” obok, bez bloku `ErrorState` (lista zadań działa dalej).
- **J7. Ruch wiersza:** przesunięcie FLIP przez `motion-duration-base` (200 ms, Luki 8; 0 przy ograniczonym ruchu); fokus zostaje na checkboxie przeniesionego wiersza, także po „Complete task” i „Cancel” w pytaniu.
- **J8. Formularz szacunku:** obie kwoty wymagane („Enter an amount.”), reszta reguł jak w E01; po zapisie formularz zostaje zajęty, aż zadanie zniknie z listy, potem fokus na następne „Add estimate”; błąd „Could not save the estimate. Try again.”.
- **J9. Teksty:** „Complete “X””, „Complete task”, „Reopening the task later does not reopen its subtasks.”, „N tasks without an estimate”, „They are not counted in future expenses until they have an estimate.”, „Add estimate for “X””, „Estimate for “X””; polskie w stories „Polish” („Ukończ zadanie”, „Przyszłe wydatki”, „Dodaj szacunek”, „Maks”).
- **J10. Miejsce w Storybooku:** Task checkbox, Subtask progress, Complete task dialog w Product/Tasks; nowy folder Product/Expenses; wzorzec Patterns/Complete and reopen; S8 w Product/Tasks/Screens.

### Partia 4 (E03): wdrożenie decyzji J (2026-10-22)

- **J1 C:** tytuł z rozwijaną treścią jest przyciskiem rozwijania (`aria-expanded`) na każdej szerokości. Cały blok tekstu (tytuł, kwota, linia meta) to jego cel dotyku, z pierścieniem fokusu wokół bloku. Strzałka od 640px tylko powtarza tytuł dla myszy (`aria-hidden`, poza kolejnością Tab); poniżej 640px jej nie ma. Jedna kontrolka na wiersz zamiast przełączania przez media query, bo przy renderowaniu na serwerze telefon zobaczyłby najpierw zły układ. Wygląd od 640px bez zmian; kolejność Tab: uchwyt → checkbox → tytuł → „…”. Na 320px tytuł ma 150px z checkboxem (było 98px), 202px bez niego.
- J2–J10: w dokumentacji „proposal” zmienione na „decision J…”.
- Sprawdzenie: `npm test` 250, 100%; `test:storybook` 882; lint, typecheck; Storybook zbudowany i obejrzany (320px polski, 1440px fokus klawiatury).

## Etap 4: co powstało (2026-10-22)

Strony pisane w poprzedniej sesji, sprawdzone i domknięte w tej (sesja przerwała się przed sprawdzeniem i wpisem tutaj).

- **Design system** (`.storybook/docs/system/`):
  - Start here: charakter w trzech zdaniach, słowa charakteru i antycharakteru, pięć kroków budowy ekranu, tabela 40 komponentów (link, import, kiedy, kiedy nie), legenda źródeł (R0x, P01–P15 kontra P1–P5 itd.), komendy;
  - Components: katalog w grupach (Primitives; Product · App shell, Sign-in, Tasks, Places, Expenses) z działającym podglądem, jednym zdaniem i linkiem; dane w `.storybook/blocks/catalog.ts`, podglądy w `Catalog.tsx`; test w story sprawdza, że każda strona komponentu jest w katalogu i każda pozycja ma podgląd;
  - How to choose: 8 tabel „if … use …” (przycisk/link/ikona/menu; radio/select/wyszukiwanie; przełącznik/checkbox; dialog/potwierdzenie/panel/strona/popover/podpowiedź; błąd pola/alert/toast; szkielet/wskaźnik; tabela/lista/karty; zakładki/strony) z przykładami z produktu;
  - Usage and accessibility: klawiatura i fokus, formularze i komunikaty, kolor, ruch, układ na szerokościach, reguły produktu pilnowane przez interfejs; każda reguła ze źródłem;
  - Content: ton (3 zdania, które mówimy, i 3, których nie), słowniczek PL/EN, przyciski, błędy, puste stany, formaty (kwoty, przedziały, liczby; daty jako propozycja L2);
  - What to avoid: antywzorce produktu (A01–A05), generyczny wygląd AI, błędy implementacji; przy każdym: jak rozpoznać w kodzie, dlaczego, czym zastąpić;
  - What is missing: pokrycie backlogu (pozycja, komponenty i ekrany, stan, priorytet), czego nie zbudowano celowo (Avatar, Tabs, Toast, Status badge, Select, Switch, ogólny Dialog, lista z filtrami, dolna nawigacja), E04, praca poza design systemem, otwarte pytania;
  - Contributing: kiedy nic, wariant, komponent; gdzie kod; co musi mieć nowy komponent (13 sekcji, stories, testy); zmiana tokenu; kto zatwierdza; komendy.
- **Strony epików** (`Design system/Epics/`): Sign-in (warunek wstępny), E01, E02, E03; każda: przepływ, ekrany i stories (mapa), komponenty i pliki, decyzje, praca, która zostaje w produkcie.
- **Plik dla agentów:** `.ai/docs/design-system.md` (charakter, sprawdzane reguły, tabela komponentów, tokeny znaczeniowe, „if … then use …”, czego unikać, treść, komendy, źródła); odwołanie w `AGENTS.md` (digest standardów i drzewo `.ai/docs/`).

### Etap 4: sprawdzenie (2026-10-22)

- `check:tokens`, `format:check`, `lint`, `typecheck`: bez błędów.
- `npm test`: 250, progi 100% spełnione (exit 0).
- `test:storybook`: 894 (447 stories × 2 motywy), a11y = error; po poprawce poniżej ponownie stories strony Components (12).
- `build-storybook`: sukces. Linki `?path=` ze stron etapu 4: 119, wszystkie wskazują istniejące wpisy w `index.json` zbudowanego Storybooka.
- Zbudowany Storybook (agent-browser): 12 stron etapu 4 renderuje się bez błędu, tabele GFM działają (brak surowych `| ---`); 5 stron (Components, Start here, How to choose, What to avoid, E02) na 320, 768 i 1440 px w obu motywach bez przewijania w poziomie; zrzuty katalogu na 1440 (ciemny) i 320 (jasny).
- Poprawione: na 320 px strona Components przewijała się w poziomie o 1 px, bo podgląd `AppHeader` w kolumnie katalogu ma 174 px (na prawdziwym ekranie 320 px nagłówek ma 288 px i się mieści). Podgląd dostał własne pole przewijania (`overflow-x-auto`, `tabIndex={0}`, `role="group"`, nazwa „App shell preview”); `role="region"` łamał `landmark-banner-is-top-level` (lekcja). Komponent produktu bez zmian.
- Kod aplikacji bez zmian. Bez nowych zależności.
- Nie sprawdzone: czytnik ekranu; pełne źródłowanie reguł stron etapu 4 sprawdziłem wyrywkowo (wyszukanie „proposal” i przegląd tabel), nie zdanie po zdaniu.

### Etap 4: propozycje L1–L4 (wszystkie przyjęte przez product ownera 2026-10-23)

- **L1. Reguły w Contributing** (oznaczone „proposal”): potrzeba na jednym ekranie → nic nie dodajemy do systemu; ta sama potrzeba w co najmniej dwóch miejscach → komponent; inny wygląd dla innego znaczenia → wariant nazwany znaczeniem (`danger`), nie wyglądem (`red`). Pierwsze dwie pochodzą z treści zadania (etap 4). Przyjąć i zmienić źródło na „task, stage 4”?
- **L2. Formaty dat i godzin** (Content, What is missing): wersja 1 nie pokazuje dat. Propozycja na później: „22 paź 2026”, „14:30” / „22 Oct 2026”, „2:30 pm”.
- **L3. Wybór języka** (What is missing, otwarte pytania): w wersji 1 język z przeglądarki przy pierwszej wizycie, bez przełącznika. Dotyczy aplikacji, nie design systemu.
- **L4. Strona epiku E04** („Later”, zaparkowany): zadanie mówi „jedna strona na każdy epik”, a E04 nie ma przepływu ani ekranów, więc jest opisany w What is missing › Later (version 2, backlog E04) zamiast osobnej strony. Zostawić tak, czy dodać krótką stronę `Design system/Epics/E04 Later` z tą samą treścią?

### Etap 4: wdrożenie decyzji L (2026-10-23)

- **L1:** reguły w Contributing mają źródła „task, stage 4” (jeden ekran → nic; co najmniej dwa miejsca → komponent) i „decision L1” (wariant nazwany znaczeniem); skrót reguły dopisany w `.ai/docs/design-system.md`.
- **L2:** formaty dat i godzin w Content i What is missing jako „decision L2” (nadal: wersja 1 nie pokazuje dat); dopisane w pliku dla agentów.
- **L3:** w What is missing wiersz w „Outside the design system” (język z przeglądarki przy pierwszej wizycie, bez przełącznika; aplikacja jeszcze tego nie robi); punkt usunięty z otwartych pytań; dopisane w pliku dla agentów.
- **L4:** nowa strona `Design system/Epics/E04 Later` (`.storybook/docs/system/epics/E04Later.mdx`): brak przepływu i ekranów, tabela odłożonych pozycji ze źródłami; kolumna „What it would need from the system” oznaczona jako propozycja. Dodana do `storySort`, link z wiersza E04 w What is missing.
- Legenda źródeł w Start here i w pliku dla agentów obejmuje L1–L4.
- Sprawdzenie: `format:check`, `check:tokens`, `lint`, `typecheck` bez błędów; `build-storybook` sukces; 122 linki `?path=` wskazują istniejące wpisy w `index.json`; 4 zmienione strony renderują tabele GFM na 1440 i 320 px bez przewijania w poziomie (zrzut strony E04 obejrzany).
- Nie uruchamiane: `npm test` i `test:storybook` (bez zmian w komponentach i stories; w `preview.tsx` zmieniona tylko kolejność menu). Kod aplikacji bez zmian, bez nowych zależności.

## Etap 5: test agentem (przygotowany 2026-10-23, do wykonania w nowej sesji)

Ekran spoza Storybooka, wybrany z backlogu: **szybka lista zakupów na telefonie** (E04, „Later”; brief: Scope › Later, D01, A04). To jedyny ekran z backlogu, którego Storybook nie pokazuje; S1–S8 z wersji 1 już są. Test to ćwiczenie dokumentacji, nie decyzja o zakresie: wynik nie trafia do produktu bez decyzji product ownera (D13).

**Opis ekranu dla agenta testowego:**

- Potrzeba użytkownika: właściciel zapomina drobne zakupy, które nie należą do żadnego dużego zadania (zamek do drzwi, klej, nawóz do trawy), a kupuje je „przy okazji”, będąc na mieście. Chce dopisać rzecz w kilka sekund i odhaczyć ją w sklepie, jedną ręką na telefonie (brief, Evidence).
- Ekran: jedna lista zakupów właściciela, pod tym samym paskiem górnym co lista zadań. Dodawanie samą nazwą. Odhaczenie oznacza „kupione”. Rzecz można poprawić i usunąć.
- Szerokości: 320 px (główna), 768 i 1440 px. Oba motywy. Teksty po angielsku i story po polsku.
- Stany do pokazania: ładowanie, pusto (pierwsze wejście), błąd ładowania, dodawanie w toku, dodawanie nieudane, poprawianie nazwy, usuwanie, wszystko kupione, dużo pozycji, długie nazwy.
- Poza zakresem: udostępnianie i role (N02), ceny i kwoty, powiązanie rzeczy z zadaniem, AI.
- Dane w przykładach: tylko z briefu i specyfikacji (np. „Door lock”, „Glue”, „Grass fertilizer”), bez wymyślonych liczb.
- Co agent oddaje: story ekranu (`Product/Shopping/Screens`, na osobnej gałęzi), mapę stanów (który stan pokazuje która story) i **listę każdego miejsca, w którym zgadywał**, z informacją, czego szukał i gdzie.
- Czego agent nie robi: nowych komponentów, wariantów ani tokenów; brakujące rzeczy wpisuje do swojej listy zamiast je dodawać.
- Po teście: każde miejsce zgadywania uzupełniam w dokumentacji albo wpisuję do „What is missing”.

## Etap 5: sprawdzenie (2026-10-23)

| Sprawdzenie | Wynik |
| --- | --- |
| `build-storybook` | sukces (po decyzjach L; od tego czasu bez zmian w Storybooku) |
| `typecheck`, `lint`, `format:check` | bez błędów |
| `check:tokens` | 0 wartości spoza tokenów; jedyny wyjątek opisany w kodzie: `--breakpoint-wide: 40rem` w `src/styles/theme.css:13` (`check-tokens-allow`, T7, F5) |
| `test:storybook` (a11y `error`, żadna reguła nie wyłączona) | 894 testy (447 stories × 2 motywy), 0 naruszeń |
| axe na stronach MDX (72 strony × 2 motywy, zbudowany Storybook) | bez naruszeń kontrastu, nazw i ARIA; tylko landmarki: `region` i `landmark-one-main` na każdej stronie (kontener dokumentacji Storybooka nie ma `main`), powtórzone `main`/`banner`/`landmark-unique` na 4 stronach z kilkoma pełnymi ekranami lub formularzami (App shell, Auth card, Tasks screens, Task form); propozycja M2 |
| Szerokości | 48 stories ekranów × 320/768/1440 × 2 motywy = 288 przebiegów: bez przewijania w poziomie, bez ekranu błędu, motyw zgodny; zrzuty obejrzane: 1440 jasny, 768 jasny, 320 ciemny z dialogiem |
| Klawiatura | lista zadań 1440 jasny: kolejność Tab motyw → Sign out → pole → Add → Details → (tytuł → „…”) w każdym wierszu; widoczny fokus na każdym elemencie; menu „…”: Enter otwiera z fokusem na pierwszej pozycji, strzałki, Escape zamyka i oddaje fokus; dialog usuwania 320 ciemny: `alertdialog` z nazwą zadania, fokus na „Cancel”, Tab zamknięty w dialogu, Escape oddaje fokus na „…” |
| Nakładki i motyw | menu i dialog renderują się poza story (w `body`), tło = `--color-surface-raised` aktualnego motywu (jasny `#e8ece7`, ciemny `#232c28`) |
| Ograniczony ruch | przy `prefers-reduced-motion: reduce` `--motion-duration-base` i `--spinner-duration` = 0s |
| 13 sekcji | 40 z 40 stron komponentów (3 strony „Screens” to mapy stanów, nie komponenty) |
| Macierz stanów | 27 z 40 komponentów ma story z zamrożonymi stanami; 13 złożonych pokazuje stany jako osobne stories (propozycja M1) |
| `npm test` | 250 testów, progi 100% spełnione |
| `npm run audit` | błąd: `next` 16.4.0 (krytyczna; aktualizacja do 16.4.2 zatwierdzona na osobnej gałęzi), `@vitest/browser` 5.0.4 (umiarkowana, zależność dev Storybooka); propozycja M4 |

Nie sprawdzone: czytnik ekranu (NVDA, VoiceOver), Firefox i Safari (tylko Chromium), prawdziwe urządzenia dotykowe, powiększenie tekstu 200% i tryb wymuszonych kolorów, `test:integration` (kod aplikacji bez zmian, ekranów nie ma jeszcze w aplikacji), źródła reguł zdanie po zdaniu (sprawdzane wyrywkowo w etapie 4), test agentem (tylko przygotowany).

**Liczby:** 72 strony dokumentacji (Design system 13, w tym 5 stron epików; Foundations 7; Primitives 18; Product 25, w tym 3 mapy stanów ekranów; Patterns 9); 40 komponentów (18 bazowych, 22 produktu); 447 stories (Design system 6, Foundations 27, Primitives 122, Product 240, Patterns 52), uruchamianych jako 894 testy w dwóch motywach; 192 testy interakcji (play function) w 54 plikach; 250 testów jednostkowych.

### Etap 5: propozycje M1–M5 (wszystkie przyjęte przez product ownera 2026-10-23, w wariantach rekomendowanych)

- **M1. Macierz stanów w złożonych komponentach.** 13 komponentów (ConfirmDialog, UnestimatedTasks, PlacePicker, AppShell, AuthCard, SignInForm, SignUpForm, SignUpClosed, CompleteTaskDialog, DeleteTaskDialog, QuickAdd, TaskForm, TaskList) nie ma story z zamrożonym najechaniem i fokusem. Stany danych i odpowiedzi API mają jako osobne stories z testami, a najechanie i fokus dziedziczą z prymitywów (Button, Input, Checkbox), które macierz mają. A: przyjąć jako opisany wyjątek i dopisać w sekcji 6 tych stron jedno zdanie z linkiem do macierzy prymitywu. B: dodać story „States” do każdego z 13.
- **M2. Landmarki na stronach dokumentacji.** Opisać jako znany wyjątek w Usage and accessibility: kontener dokumentacji Storybooka nie ma `main`, a strony z kilkoma pełnymi ekranami powtarzają `main` i `banner`. Każda story osobno przechodzi axe w trybie `error`; ekran w aplikacji ma jeden `main`.
- **M3. Pierścień fokusu na bloku tytułu wiersza (J1)** stoi 2px od tekstu (odsunięcie `focus-ring-offset`, blok bez wewnętrznego odstępu), więc wygląda ciasno przy pierwszej literze i przy „zł”. Propozycja: wewnętrzny odstęp `space-inline` (4px) w bloku z takim samym ujemnym marginesem, żeby układ się nie przesunął. Alternatywa: zostawić.
- **M4. Audyt.** `next`: bez zmian tutaj, idzie osobną gałęzią (zatwierdzone). `@vitest/browser` 5.0.4 (zależność dev design systemu, GHSA-p458-7748-mcp3, serwer Vitest): podnieść do wersji z poprawką w osobnej zmianie (`npm audit fix`, bez `--force`), czy zostawić do aktualizacji Vitesta?
- **M5. Ekran do testu agentem:** szybka lista zakupów (E04, wersja 2), opis wyżej. Potwierdzić, czy wybrać inny.

Rozstrzygnięcie: M1 wariant A (opisany wyjątek); M2 opisać jako znany wyjątek; M3 poszerzyć warstwę fokusu o `space-inline`; M4 `vitest` osobną gałęzią `chore/vitest-audit` po design systemie, zakładaną na polecenie, `next` na swojej gałęzi; M5 lista zakupów zostaje ekranem testu.

### Etap 5: wdrożenie decyzji M (2026-10-23)

- **M1:** w sekcji 6 każdej z 13 stron (ConfirmDialog, UnestimatedTasks, PlacePicker, AppShell, AuthCard, SignInForm, SignUpForm, SignUpClosed, CompleteTaskDialog, DeleteTaskDialog, QuickAdd, TaskForm, TaskList) zdanie: brak własnego wyglądu najechania, fokusu i wciśnięcia, z linkami do macierzy części (Button, Input, Form field, Checkbox, Text action / Link, Collapsible, Password input, Surface, Skeleton, Theme toggle, Place tag, Place color picker, Task row); w TaskList dodatkowo własny fokus listy po usunięciu (story Delete Confirmed). W ConfirmDialog stare zdanie „(see Button)” zastąpione nowym. Contributing: macierz zamrożonych stanów tylko dla komponentu z własnym wyglądem interakcji (decision M1).
- **M2:** Usage and accessibility › Known exceptions: landmarki na stronach dokumentacji (`region`, `landmark-one-main`; powtórzone `main`/`banner` na 4 stronach) oraz istniejący wyjątek T1 (`color-border-divider` poniżej 3 : 1, tylko dekoracja).
- **M3:** `src/product/tasks/task-row.tsx`: warstwa fokusu tytułu `after:inset-y-0 after:-inset-x-inline` zamiast `after:inset-0`; pierścień stoi 6px od tekstu, cel dotyku urósł o 4px z każdej strony (w połowie odstępu `space-group`). Zmierzone na 320 i 1440 px: zewnętrzna krawędź pierścienia kończy się dokładnie na polu dotyku checkboxa i „…”, bez nachodzenia. Test regresji w story TaskRow › Collapsed (lewa i prawa krawędź warstwy = −`space-inline`); bez poprawki test się wywraca (sprawdzone). Strona TaskRow, tabela stanów: opis fokusu z odwołaniem do M3.
- Sprawdzenie: `format:check`, `check:tokens`, `lint`, `typecheck` bez błędów; `npm test` 250 (100%); `test:storybook` 894; `build-storybook` sukces; 164 linki `?path=` wskazują istniejące wpisy; nowa sekcja Known exceptions i zdanie M1 (QuickAdd) widoczne w zbudowanym Storybooku, tabele GFM renderują się; zrzuty pierścienia na 320 i 1440 px obejrzane.

## Etap 6: wynik testu agentem (2026-10-23)

Test z `.ai/design/prompt-agent-test.md` wykonany: ekran szybkiej listy zakupów jako story `Product/Shopping/Screens` (19 stories, oba motywy, axe bez naruszeń) na gałęzi `design/shopping-screen-agent-test`, niezmergowanej. Log z pełną tabelą decyzji: `.ai/runs/2026-10-23-shopping-screen-agent-test.md`.

- **Decyzje:** 52, w tym REGUŁA 29, PRZYKŁAD 4, ZGADUJĘ 19. Wartości spoza tokenów: 0.
- **Podział luk:** 5 sprzeczności lub braków w dokumentacji (poprawione niżej, bez nowych decyzji), 7 pytań specyficznych dla listy zakupów (wpisane na stronę E04 Later, do rozstrzygnięcia w speku E04), reszta to luki ogólne, dotyczące każdego kolejnego ekranu (propozycje N1–N11, niżej).

### Etap 6: poprawki dokumentacji (A)

- **Nawigacja** (Foundations › Spacing and layout): zdanie „version 1 has two places … navigation sits at the bottom” stało w sprzeczności z decyzją E1. Teraz: wersja 1 ma jeden ekran, więc bez nawigacji (E1); przy drugim ekranie nawigacja na telefonie na dole, tyle pozycji, ile ekranów (P07, R02.11), pasek jeszcze nie zaprojektowany.
- **Tooltip przy „…”** (Primitives › Tooltip): fragment `<Tooltip><MenuTrigger asChild><Button …/></MenuTrigger></Tooltip>` dawał pusty dymek, bo `Tooltip` czyta `aria-label` z bezpośredniego dziecka (`MenuTrigger`). Poprawiony przykład kodu i nowa story **With Menu** z testem (tekst dymka, nazwa przycisku raz, Enter otwiera menu, Escape oddaje fokus). Dopisane w sekcji 2: `TaskRow` („…”) i `DragHandle` nie mają jeszcze tooltipa (propozycja N4); nowy ekran stosuje regułę, nie kopiuje `TaskRow`.
- **Nazwa checkboxa** (Primitives › Checkbox, sekcje 7 i 8): „label to rzecz, nie polecenie” dotyczy widocznego `Label`; pole nazwane `aria-label` obok widocznego tytułu nazywa się jak przycisk z ikoną, czynność i obiekt („Complete “…””, `TaskCheckbox`, decyzja J9). Zdanie „proposal; settled in stage 3” zastąpione odwołaniem do J9.
- **Tokeny komponentów** (`.ai/docs/design-system.md`): nowa tabela token → klasa → przeznaczenie (`min-h-row`, `py-row-y`, `pl-row-indent`, `w-touch`, `size-icon`, `size-checkbox`, `row-highlight`, `max-w-overlay` i inne) oraz zdanie, że tokeny komponentu należą do swojego komponentu, a użycie tokenów wiersza zadania w innych listach jest otwarte (propozycja N2).
- **E04 Later:** tabela „Quick shopping list: what the agent test left open” (nazwa i słowa, usuwanie kupionych, limit nazwy, wszystko kupione, kolejność, nawigacja, dane przykładowe) z tym, co założył test.
- **Prompt testu:** język interfejsu wskazuje `.ai/docs/design-system.md` › Content zamiast AGENTS.md (AGENTS.md o języku nie mówi).
- **Lekcja:** `.ai/lessons.md`, wpis o `Tooltip` i `MenuTrigger`.

### Etap 6: propozycje N1–N11 (B, do decyzji product ownera)

Luki ogólne z testu agentem, czyli te, które dotkną każdego kolejnego ekranu, nie tylko listy zakupów. Przy każdej: skąd się wzięła (numer decyzji z tabeli w `.ai/runs/2026-10-23-shopping-screen-agent-test.md`), warianty i rekomendacja. Lista zakupów to wersja 2 (R02.8, P03), więc tam, gdzie potrzeba wynika tylko z niej, rekomendacja to opisać przepis teraz, a komponent zbudować przy speku E04.

- **N1. Wiersz listy, która nie jest listą zadań** (#10, #11, #32). `TaskList` i `TaskRow` zawsze pokazują szacunek („No estimate”) i menu zadania, więc agent skopiował układ `TaskRow` ręcznie (checkbox, nazwa, „…”, linia „Saving…”, komunikat w wierszu). Contributing: ta sama potrzeba w dwóch miejscach → propozycja komponentu, ale drugie miejsce to wersja 2. **A (rekomendowany):** teraz tylko przepis w Patterns › List („A list that is not tasks”: struktura, klasy, fokus po usunięciu, przykład kodu), komponent `ListRow` przy speku E04. **B:** wydzielić teraz prezentacyjny `ListRow` z `TaskRow` (`TaskRow` zbudowany na nim; testy, strona z 13 sekcjami, katalog).
- **N2. Tokeny wiersza zadania w innych listach** (#11). `min-h-row`, `py-row-y` pochodzą z `--task-row-*`, a tokeny komponentu należą do jednego komponentu (tokeny.md). **A (rekomendowany):** zapisać, że `task-row-min-height` i `task-row-padding-y` to geometria każdego wiersza listy (bez zmiany kodu); przemianowanie na `--list-row-*` razem z N1-B. **B:** przemianować teraz (tokens.css, theme.css, Foundations; bez zmiany wyglądu). **C:** zakazać użycia poza `TaskRow` (inne listy dostaną własne tokeny).
- **N3. Szybkie dodawanie samą nazwą** (#9). `QuickAdd` zawsze ma „Details” z opisem i kwotami. **A (rekomendowany):** przepis w Patterns › Quick capture („A list whose items have only a name”: `useForm` + `FormField` + `Input` + `Button` + `Alert`, `resetOnSuccess`), komponent przy speku E04. **B:** tryb `QuickAdd` bez szczegółów teraz (wariant nazwany znaczeniem, np. `fields="title"`; L1).
- **N4. Tooltip przy „…” i uchwycie** (#16; poprawka A w Tooltip.mdx). Reguła mówi „każdy przycisk z samą ikoną: uchwyt, „…”, plus” (Luki 7, P4), a żaden komponent produktu jej nie stosuje (`TaskRow`, `DragHandle`). **A (rekomendowany):** dodać `Tooltip` w `TaskRow` („…”, z etykietą na `MenuTrigger`) i w `DragHandle`, z testem w story i aktualizacją stron. **B:** złagodzić regułę: tooltip tylko poza wierszem listy; w wierszu wystarcza `aria-label`.
- **N5. „Zrobione” dla czegoś, co nie jest zadaniem** (#12, #13, #14). How to choose zna tylko `TaskCheckbox` (zadanie) i `Checkbox` w formularzu. **A (rekomendowany):** dopisać w How to choose › Switch and checkbox: rzecz z listy zrobiona lub kupiona → `Checkbox` z widocznym `Label` (nazwa rzeczy), wygląd i kolejność jak w Complete and reopen (otwarte najpierw, odznaczona wraca na górę). **B:** uogólnić `TaskCheckbox` (nazwa i dokumentacja) na każdy wiersz listy.
- **N6. Wygląd „zrobione” na `Label`** (#40, #41). Contributing zabrania zmiany wyglądu przez `className`, a `Label` nie ma stanu „zrobione”; agent dał `span` w środku. **A (rekomendowany):** opisać ten przepis na stronie Checkbox (sekcja 11, przykład „kupione”) i zapisać, że nazwa rzeczy ma zwykłą grubość (tytuł zadania jest pogrubiony, bo otwiera szczegóły). **B:** wiersz z N1-B przejmuje ten wygląd; do tego czasu A.
- **N7. Telefon w jednej ręce** (#6). Brak zasady o zasięgu kciuka i miejscu pola dodawania na telefonie, a potrzeba z briefu mówi wprost o jednej ręce w sklepie. **A (rekomendowany):** wersja 1 bez zmian (pole na górze, jak w liście zadań); pytanie o pole na dole lub przypięte nad klawiaturą rozstrzygnąć w speku E04 i dopiero wtedy dopisać wzorzec. **B:** już teraz wzorzec „na telefonie pole dodawania na dole ekranu” dla wszystkich list (zmienia ekran zadań).
- **N8. Wysokość wiersza i skeletonu** (#24; zmierzone w zbudowanym Storybooku, Product/Tasks/Screens, 320 i 1440 px). Jednoliniowy wiersz zadania ma 68 px (12 + cel 44 + 12), nie 64 px, jak mówią token `task-row-min-height` i Foundations („at least 64px”); token nigdy nie działa, bo treść wiersza ma `min-h-touch`. Wiersz skeletonu zadań ma 71,5–72,5 px, więc lista po wczytaniu skacze o około 4 px na wiersz. **A (rekomendowany):** poprawić opis w Foundations i w tokens.css na „68px: 44px cel + 12px nad i pod” (z nazwą źródła T10), a wiersz skeletonu ustawić na tę samą wysokość co wiersz (test w story TaskList › Loading porównujący wysokości). Dopisać w Skeleton §8 regułę „wiersz skeletonu ma wysokość prawdziwego wiersza; jeden pasek na linię tekstu”. **B:** zmienić token na 68px (`4.25rem`) i zostawić skeleton.
- **N9. Animacja przesunięcia w innych listach** (#33). `useMoveAnimation` nie jest eksportowany, więc odhaczona rzecz przeskakuje (Complete and reopen, reguła 10). **A (rekomendowany):** zapisać, że lista spoza zadań może przeskakiwać do czasu N1-B (komponent wiersza przejmie animację). **B:** wyeksportować hook z `@taskly/ui` (dokumentacja, test).
- **N10. Lista, w której wszystko zrobione** (#34). Brak reguły, czy pokazać komunikat. Istniejąca zasada „sukces → nic, wynik jest potwierdzeniem” (P3, How to choose) już to rozstrzyga. **A (rekomendowany):** dopisać w Patterns › List: „wszystko zrobione: bez komunikatu, widać to po wierszach”. **B:** wyciszone zdanie pod listą („Wszystko kupione.”).
- **N11. Strona Spacing and layout przewija się w poziomie na 320 px** (znalezione przy sprawdzaniu poprawek A, istniało wcześniej): diagram anatomii wiersza sięga 423 px, tabela tokenów 349 px. To błąd, nie decyzja. **Rekomendacja:** naprawić jak w lekcji z 2026-10-22: każdy szeroki podgląd we własnym pudełku `overflow-x-auto` z `tabIndex={0}`, `role="group"` i nazwą; sprawdzić wszystkie strony MDX na 320 px (`scrollWidth > clientWidth`).

Rozstrzygnięcie (2026-10-23): wszystkie N1–N11 w wariantach rekomendowanych.

### Etap 6: wdrożenie decyzji N (2026-10-23)

- **N1, N3:** przepisy w Patterns › List („A list that is not tasks”: tabela części, przykład kodu wiersza) i Patterns › Quick capture („A list whose items have only a name”: `useForm` + `FormField` + `Input` + `Button` + `Alert`). Komponenty `ListRow` i szybkie dodawanie samą nazwą wpisane na stronę E04 jako to, czego lista zakupów będzie potrzebować.
- **N2:** geometria wiersza zadania (`min-h-row`, `py-row-y`) obowiązuje każdy wiersz listy: zdanie w `.ai/docs/design-system.md`, Foundations › Spacing and layout, komentarz w `tokens.css`. Nazwy bez zmian do czasu wspólnego komponentu.
- **N4:** `DragHandle` sam owija przycisk w `Tooltip`; `TaskRow` owija „…” w `Tooltip` z etykietą na `MenuTrigger`, a uchwyt chowa poniżej 640px opakowaniem (`hidden wide:inline-flex` przeniesione z przycisku na `span`, bo inaczej puste opakowanie tooltipa dodawało odstęp na telefonie). Testy jednostkowe: dymek „More actions for “…”” i „Move “…”” na fokusie, bez `aria-describedby`; test uchwytu sprawdza ukrycie na opakowaniu. Strony Tooltip, Task row, Drag handle zaktualizowane.
- **N5, N6:** How to choose › Switch and checkbox (nowy wiersz), Checkbox › sekcja 11 (przykład „zrobione” ze `span` w `Label`; przy okazji nazwa w przykładzie `TaskCheckbox` z cudzysłowami jak w J9), plik dla agentów.
- **N7:** pytanie o miejsce pola dodawania przy obsłudze jedną ręką w tabeli E04; Quick capture: w wersji 1 pole nad listą na każdej szerokości.
- **N8:** wiersz skeletonu w `TaskList`: ten sam blok 44px (`min-h-touch`) między paddingami co prawdziwy wiersz, dwa paski w rozmiarze `text-meta` (było 71,5 px, jest 68 px jak wiersz). Test w story Task list › Loading porównuje wysokość z `2 × task-row-padding-y + touch-target-min`; na starym kodzie pada (71,5 zamiast 68, sprawdzone). Opis 64/68 px poprawiony w Foundations, Task row, `tokens.css`; reguła w Skeleton § 8 i przykład w § 11.
- **N9:** Complete and reopen, reguła 10: listy spoza zadań przeskakują do czasu wspólnego komponentu.
- **N10:** Patterns › List: „wszystko zrobione” bez komunikatu (P3).
- **N11:** skan wszystkich 72 stron MDX na 320px: przewijało się 11 (nie tylko Spacing and layout). Przyczyny: przykłady Do/Don't (formularze szersze niż wąska kolumna dokumentacji), diagram relacji odstępów, karta logowania na stronie Surface. Poprawki tylko w blokach dokumentacji: `DoDont` dostaje własne pudełko przewijania (`role="group"`, nazwa „Do example” / „Don't example”, `tabIndex={0}`, pierścień fokusu, wewnętrzny odstęp na pierścienie), diagram się zawija, karta na stronie Surface zajmuje szerokość komórki (`wide`).
- Legenda źródeł (Start here, plik dla agentów): dopisane M1–M5 i N1–N11.

## Etap 7: drugi test agentem (2026-10-23)

Test z `.ai/design/prompt-agent-test.md` powtórzony w nowej sesji po wdrożeniu N1–N11, bez wglądu w pierwszy przebieg: 15 stories `Product/Shopping/Screens` (oba motywy, axe bez naruszeń) i strona z mapą stanów na gałęzi `design/shopping-screen-agent-test-2`, niezmergowanej. Log z tabelą 62 decyzji, listą 18 luk i porównaniem z pierwszym przebiegiem: `.ai/runs/2026-10-23-shopping-screen-agent-test-2.md`.

- **Decyzje:** 62, w tym REGUŁA 31, PRZYKŁAD 19, ZGADUJĘ 12 (pierwszy przebieg: 29 / 4 / 19). Wartości spoza tokenów: 0.
- **Co zadziałało:** wszystkie luki pierwszego przebiegu o wyglądzie i zachowaniu listy są zamknięte (N1–N6, N8–N10, poprawki A z etapu 6); agent szedł za przepisami bez zgadywania.
- **Co wróciło:** pytania produktowe przeniesione na stronę E04 (nazwa i słowa, limit nazwy, usuwanie kupionych, kolejność, nawigacja, dane przykładowe). Wpisanie ich do tabeli nie wystarcza: każdy kolejny agent zgaduje je od nowa, dopóki nie ma speku E04.
- **Podział nowych luk:** 6 sprzeczności lub braków w dokumentacji i w prompcie testu (A, niżej, do poprawienia bez nowych decyzji), 7 luk ogólnych (propozycje O1–O7), pytania produktowe do tabeli E04 (C).

### Etap 7: poprawki dokumentacji (A, bez nowych decyzji; jeszcze nie wprowadzone)

- **„places” w How to choose** (Tabs and separate pages): „navigation on a phone: at the bottom, as many items as places in version 1”. W słowniku „place” to pomieszczenie (miejsce), więc wiersz czyta się „jedna pozycja na pokój”. Poprawić na „screens”, jak w Foundations › Spacing and layout.
- **E04 a reszta dokumentacji** (luka 17): What is missing › Later i E04 Later mówią „nothing … is designed”, „No component, pattern or screen story belongs to E04”, a How to choose (N5), Patterns › List i Quick capture mają już przepisy dla listy zakupów. Poprawić E04 Later › Screens and stories: przepisy N1, N3, N5, N6 są gotowe, ekranu nie ma; story testów agentem leżą na gałęziach testowych, niezmergowane. What is missing › Later: to samo jednym zdaniem.
- **Quick capture, „in version 1”** (luka 14): „The field stays above the list on every width in version 1” nie obejmuje listy zakupów (wersja 2), więc N7 jest nadal otwarte dla jedynego ekranu, którego dotyczy. Poprawić na „until the E04 spec decides where it sits for one-handed use (decision N7)”.
- **Prompt testu, język** (luka 15): „Teksty po angielsku i story po polsku” brzmi jak sprzeczność z Content („stories in English first, with a Polish story”). Poprawić na „Teksty po angielsku, plus story z polskim tekstem (Content)”.
- **Prompt testu, testy** (luka 16): reguła 4 „nie dodawaj testów” a jedyny sposób pokazania stanu interakcji to funkcja `play`, którą `test:storybook` uruchamia jako test. Dopisać: „funkcje `play` wolno używać, żeby dojść do stanu (wpisać, kliknąć, poczekać), bez asercji i bez testów jednostkowych”.
- **Kolejność w menu bocznym** (luka 18): Contributing (punkt 6) wymaga wpisu w `storySort` dla nowego komponentu, o ekranach nowego obszaru milczy, a prompt zabrania zmian konfiguracji. Dopisać w Contributing: „a new area (Product / X) gets its place in `storySort` with its first component; until then it sorts after the listed groups”, a w prompcie: „brak wpisu w `storySort` nie jest luką”.

### Etap 7: propozycje O1–O7 (B, do decyzji product ownera)

Numery luk z `.ai/runs/2026-10-23-shopping-screen-agent-test-2.md` (Gaps), numery decyzji z tabeli Step 1. Tak jak w N: gdzie potrzeba wynika tylko z listy zakupów (wersja 2), rekomendacja to przepis teraz, komponent przy speku E04.

- **O1. Poprawianie rzeczy, która ma tylko nazwę** (luka 3, #31, #32). Patterns › Inline edit opisuje tylko `TaskForm` (tytuł, opis, kwoty); agent skopiował jego układ i zgadł etykietę „Name”. Najbliższy istniejący przykład to `PlaceForm` w `PlacePicker` (pole „Name” + Save/Cancel). **A (rekomendowany):** sekcja „An item with only a name” w Patterns › Inline edit: ramka `bg-raised p-inset` w miejscu wiersza, `FormField label="Name"` + `Input` z `autoFocus`, Save (primary) / Cancel w `flex flex-col gap-group wide:flex-row`, Escape anuluje poza zapisywaniem, fokus wraca na „…”, komunikaty „Enter a name.” i „Could not save the item. Try again.”, przykład kodu. Komponent razem z `ListRow` przy speku E04. **B:** teraz tryb `TaskForm` z samym tytułem (wariant nazwany znaczeniem, np. `fields="title"`; L1).
- **O2. Usuwanie czegoś, co nie jest zadaniem** (luka 4, #34–#36). `DeleteTaskDialog` jest tylko dla zadań, więc stan „Deleting…”, błąd w dialogu i fokus po zamknięciu agent odtworzył wokół `ConfirmDialog` (ok. 30 linii). Miejsca usuwa się inaczej, pytaniem w formularzu (G6), więc dialog usuwania istnieje dziś w jednym komponencie. **A (rekomendowany):** sekcja „A list that is not tasks” w Patterns › Delete confirmation: `ConfirmDialog` sterowany stanem listy, tytuł „Delete “X”?”, potwierdzenie „Delete item”, `pending`, `error` w środku, `onCloseAutoFocus` z `preventDefault` (lista albo „…”), przykład kodu; ogólny dialog razem z `ListRow` przy speku E04. **B:** teraz wydzielić `DeleteDialog` (nazwa obiektu, etykiety, `onConfirm`) z `DeleteTaskDialog`, który zostanie zbudowany na nim (testy, strona z 13 sekcjami, katalog).
- **O3. Skeleton a kolumny przed tekstem** (luka 6, #38). N8 ustaliło wysokość i „jeden pasek na linię”, ale nie miejsce paska. Wiersz z checkboxem zaczyna nazwę 52 px od krawędzi (cel 44 px + `space-group`), a pasek skeletonu zaczyna się na krawędzi. To samo dotyczy `TaskList`: od 640 px tytuł stoi za kolumną strzałki (i uchwytu, i checkboxa przy E02/E03), a paski skeletonu zaczynają się przy krawędzi wiersza (z kodu `task-list.tsx`; do zmierzenia przy wdrożeniu). **A (rekomendowany):** reguła w Skeleton § 8 „paski zaczynają się tam, gdzie tekst wiersza: kolumny przed nim zostają puste (`w-touch`)”; w `TaskList` te same odstępy co w wierszu (strzałka od 640 px; uchwyt i checkbox, gdy lista je ma), test w story Task list › Loading porównujący lewą krawędź paska z tytułem; przepis w Patterns › List › Loading. **B:** reguła „pasek od krawędzi wiersza” (jak dziś), bez zmiany kodu; skeleton pokazuje kształt, nie układ kolumn.
- **O4. Fokus po usunięciu ostatniej rzeczy** (luka 8, #60). Delete confirmation i Usage and accessibility: „after a delete focus goes to the list”, ale po usunięciu ostatniej pozycji listę zastępuje pusty stan. Z kodu `task-list.tsx` wynika, że `TaskList` ma ten sam problem: `listRef` wskazuje wtedy na odmontowaną listę i fokus trafia na stronę, czego reguła zabrania (WCAG 2.4.3). Do potwierdzenia testem przy wdrożeniu. **A (rekomendowany):** fokus na pusty stan: `Surface` z `EmptyState` dostaje `tabIndex={-1}` (jak lista) i fokus, czytnik ekranu czyta „No tasks yet. Add the first thing you need to do.”, a następny Tab prowadzi do listy dalej; poprawka w `TaskList` z testem regresji, reguła w Delete confirmation i Usage. **B:** fokus do pola dodawania (następny krok pustego stanu; tak zgadł agent). Wymaga przekazania pola do listy (ref albo callback), bo `TaskList` nie zna `QuickAdd`.
- **O5. Akcje zrobionej rzeczy w liście spoza zadań** (luka 11, #29). Decyzja I3 (ukończony wiersz zachowuje Edit, Places…, markery i Delete) jest zapisana dla zadań; agent przeniósł ją przez analogię. **A (rekomendowany):** dopisać w Patterns › List („A list that is not tasks”, Actions): zrobiona rzecz zachowuje Edit i Delete, jak ukończone zadanie (I3). **B:** zrobiona rzecz ma tylko Delete (poprawianie nazwy czegoś kupionego jest rzadkie).
- **O6. Przycisk zmienia szerokość w trakcie** (luka 9). „Add” → „Adding…” poszerza przycisk i zwęża pole na 320 px; `QuickAdd` robi to samo. Reguła Content („the pending label is the same verb in -ing”) to wymusza. **A (rekomendowany):** bez zmian; zapisać na stronie Button (Responsive) i w Quick capture, że pole zwęża się na czas dodawania, i że to świadome (etykieta mówi, co się dzieje, B2). **B:** w polu z przyciskiem w jednej linii zostawić „Add” i sam spinner (wyjątek od Content; czytnik ekranu dostaje `aria-busy`).
- **O7. Dane przykładowe ponad trzy rzeczy z briefu** (luka 13, #45, #47). Prompt pozwala tylko na dane z briefu i specyfikacji, a stany „dużo pozycji” i „długie nazwy” potrzebują więcej nazw; oba przebiegi wymyśliły je inaczej. **A (rekomendowany):** w prompcie testu: „poza briefem wolno użyć nazw materiałów, które już są w story zadań (`task-data.ts`) i w specu E01”; przy speku E04 wspólny zestaw `shopping-data.ts` w `.storybook/blocks`. **B:** teraz `shopping-data.ts` z zatwierdzoną listą nazw (właściciel wybiera), używany przez każdy test.

### Etap 7: pytania produktowe do tabeli E04 Later (C)

Bez zmian w systemie; po decyzji dopisać do tabeli „Quick shopping list: what the agent test left open” kolumnę z założeniem drugiego przebiegu. Oba przebiegi zgadły tak samo: nazwa „Shopping list” / „Lista zakupów”, „item” / „rzecz”, kupione po otwartych, usuwanie pojedynczo, bez limitu nazwy, bez nawigacji, pole na górze. Różniły się: tekst pustego stanu (identyczny), dane przykładowe (inne nazwy), kolejność ręczna (pierwszy: „nie”, drugi: nie rozważył). Nowe pytania do tabeli:

- Czy lista pokazuje licznik („2 z 5 kupione”).
- Nazwa listy dla czytnika ekranu i polski komunikat odrzuconej zmiany („It is back as it was”; drugi przebieg: „Wróciło do poprzedniego stanu.”). Polskiej wersji tego zdania nie ma też dla zadań: komunikaty o odrzuconej zmianie (`taskMessages.changeFailed`, `moveFailed` w `.storybook/blocks/task-data.ts`) istnieją tylko po angielsku.

Rozstrzygnięcie (2026-10-23): wszystkie A, O1–O7 i C w wariantach rekomendowanych.

### Etap 7: wdrożenie decyzji O (2026-10-23)

- **A:** How to choose › Tabs and separate pages („one item per screen”); E04 Later (wstęp, Screens and stories: przepisy gotowe, ekranu nie ma, gałęzie testów) i What is missing (wiersz E04, zdanie w Later); Quick capture (N7 otwarte do speku E04); Contributing, punkt 6 (nowy obszar w `storySort` z pierwszym komponentem); prompt testu: język, funkcje `play` bez asercji, brak wpisu w `storySort` nie jest luką.
- **O1:** Patterns › Inline edit, sekcja „An item with only a name” (tabela części, przykład kodu).
- **O2:** Patterns › Delete confirmation, sekcja „A list that is not tasks” (tabela części, przykład kodu z fokusem z O4).
- **O3:** `TaskList`: wiersz skeletonu ma te same puste kolumny co wiersz (strzałka od 640px zawsze, uchwyt przy `onMove`, checkbox przy `onToggleComplete`), więc paski zaczynają się tam, gdzie tytuły. Test jednostkowy (liczba kolumn) i story Task list › Loading Lines Up (lewa krawędź paska = lewa krawędź tytułu); na starym kodzie story pada (sprawdzone). Reguła w Skeleton § 8, Patterns › List › Loading, plik dla agentów.
- **O4:** `TaskList`: pusty stan jest fokusowalny (`tabIndex={-1}`), a po zamknięciu dialogu usuwania fokus idzie do pierwszego z „…” (po Cancel) i listy, który jest jeszcze na stronie, a jeśli żadnego nie ma, do pustego stanu. Błąd potwierdzony: po usunięciu ostatniego zadania fokus trafiał na `body`. Test regresji (jednostkowy) i story Task list › Delete Last; oba padają na starym kodzie (sprawdzone). Reguła w Delete confirmation, Usage and accessibility, Task list, plik dla agentów.
- **O5:** Patterns › List › Actions: zrobiona rzecz zachowuje Edit i Delete (I3).
- **O6:** Button › Responsive i Quick capture: przycisk z etykietą „Adding…” jest na chwilę szerszy, a pole węższe; to świadome (B2).
- **O7:** prompt testu: poza briefem wolno użyć nazw materiałów ze story zadań i speku E01.
- **C:** E04 Later, tabela pytań z kolumnami obu testów i nowymi wierszami (licznik, nazwa listy i pusty stan, polski komunikat odrzuconej zmiany).
- Legenda źródeł (Start here, plik dla agentów): dopisane O1–O7.

## Etap 8: trzeci test agentem (2026-10-23)

Test z `.ai/design/prompt-agent-test.md` powtórzony w nowej sesji po wdrożeniu O1–O7, bez wglądu w dwa pierwsze przebiegi: 26 stories `Product/Shopping/Screens` (oba motywy, axe bez naruszeń) i strona z mapą stanów na gałęzi `design/shopping-screen-agent-test-3` (af84092), niezmergowanej. Log z tabelą 62 decyzji i listą 18 luk: `.ai/runs/2026-10-23-shopping-screen-agent-test-3.md` (na tej gałęzi).

- **Decyzje:** 62, w tym REGUŁA 34, PRZYKŁAD 14, ZGADUJĘ 14 (drugi przebieg: 31 / 19 / 12, pierwszy: 29 / 4 / 19). Wartości spoza tokenów: 0 (jedyna klasa poza tokenami to ułamek `w-2/3`).
- **Co zadziałało:** przepisy O1–O5 (poprawianie, usuwanie, skeleton, fokus po ostatniej rzeczy, akcje kupionej rzeczy) agent zastosował bez zgadywania.
- **Nowe rodzaje luk:** sprzeczności między stronami (Optimistic change a Inline edit / Delete confirmation; reguła Checkboxa o pierwszej linii a przepis List), zasady istniejące tylko w kodzie `TaskList` (fokus po odhaczeniu, podświetlenie nowego wiersza, miejsce nowej rzeczy), skeleton wiersza z jedną linią.

### Etap 8: poprawki dokumentacji (A, bez nowych decyzji)

Luki 6–10, 13, 15–17 z logu testu: zapisanie tego, co już robią kod i przykłady.

- **Miejsce nowej rzeczy, fokus po odhaczeniu, podświetlenie nowego wiersza** (luki 8–10): Patterns › List, tabela „A list that is not tasks” (wiersz New item, Order).
- **Co działa od razu, a co czeka** (luka 13): Optimistic change mówił „an edit patches the row; a delete removes it”, a Inline edit i Delete confirmation, że formularz i dialog czekają na serwer. Rozdzielone: dodanie, odhaczenie, przesunięcie i znaczniki od razu; edycja i usuwanie po odpowiedzi serwera (wtedy spec E01 „patches / removes”).
- **Wiersz w trakcie zapisu** (luka 15): przepis mówił „the row's controls disabled”, `TaskRow` wyłącza checkbox i pozycje menu „…”, a samo menu się otwiera. Przepis dopasowany do `TaskRow`.
- **Nagłówek strony i odstępy** (luki 6, 7): App shell (`h1`, `text-heading font-strong`, nazwa listy) i Spacing and layout › Relations (nagłówek, linia pod nim, formularz i lista co `space-between-groups`).
- **Checkbox w tabelach komponentów** (luka 16): Start here i strona Checkbox › When to use z wierszem o rzeczy z listy innej niż zadania (N5).
- **E04 Later** (luka 17): link do logu drugiego testu, którego nie ma na `main`; teraz wskazuje gałęzie.

### Etap 8: propozycje U1–U4 (B, do decyzji product ownera)

- **U1. Pole wyboru a pierwsza linia długiej nazwy** (luka 14). Checkbox › Content: „align the first line with the box”; przepis List i `TaskRow` centrują blok tekstu względem celu 44 px, więc przy dłuższym tekście pole jest niżej niż pierwsza linia. Zmierzone (Product/Tasks/Screens › Progress Desktop): wiersz bez linii meta 0 px różnicy, każdy wiersz z linią meta 9,4 px; na telefonie każdy wiersz zadania (szacunek pod tytułem) około 11 px. **A:** tekst od góry z odstępem (44 px − linia) / 2 (nowy token komponentu); wiersze z linią meta na komputerze 68 → ok. 76 px, każdy wiersz zadania na telefonie 68 → ok. 79 px (z meta 86 → ok. 98 px). **B:** bez zmian w kodzie; reguła Checkboxa opisuje to, co jest: blok tekstu wyśrodkowany względem celu, póki się w nim mieści, dłuższy rośnie w dół, a pole zostaje u góry.
- **U2. Skeleton wiersza z jedną linią** (luka 3): jeden pasek w rozmiarze tekstu podstawowego (`h-lh`), `w-2/3`, trzy wiersze; Skeleton § 8 i Patterns › List.
- **U3. Szerokości ułamkowe** (luka 12): `w-2/3`, `w-1/3` to proporcje, nie wartości projektowe; `check:tokens` już je przepuszcza. Zapisać w zasadach (Start here, plik dla agentów, Skeleton).
- **U4. Status tabeli w E04 Later** (luka 18): do speku E04 założenie, w którym zgodziły się wszystkie testy, obowiązuje; gdzie się różnią albo któryś nie odpowiedział, pytanie zostaje otwarte.

### Etap 8: pytania produktowe do tabeli E04 Later (C)

Luki 2, 4, 5, 11: nawigacja między listami, dodawanie przed wczytaniem listy, limit nazwy, słownictwo i teksty. Do tabeli dopisana kolumna trzeciego testu i dwa wiersze: dodawanie przed wczytaniem (albo po błędzie) i teksty pozostałych stanów (dodanie nieudane, ładowanie, błąd ładowania).

Rozstrzygnięcie (2026-10-23): A, U2–U4 i C w wariantach rekomendowanych. U1: właściciel wybrał najpierw A; przy wdrożeniu test pokazał, że na telefonie rośnie każdy wiersz zadania (wcześniej podałem tylko wiersze z linią meta), więc pytanie wróciło z tymi liczbami i właściciel wybrał **B**.

### Etap 8: wdrożenie (2026-10-23)

- **A:** Patterns › List (Text block, New item, Order), Optimistic change (dwie reguły zamiast jednej), App shell (`h1`), Spacing and layout › Relations, Start here i Checkbox (N5), E04 Later (gałęzie testów), plik dla agentów.
- **U1 (B):** Checkbox › Content; Patterns › List › Text block; plik dla agentów. Kod bez zmian (próba A cofnięta przed commitem).
- **U2:** Skeleton § 8, Patterns › List › Loading, plik dla agentów.
- **U3:** Start here (krok 3), Skeleton § 8, plik dla agentów.
- **U4 i C:** E04 Later (zdanie o założeniach, kolumna trzeciego testu, dwa nowe wiersze).
- Legenda źródeł (Start here, plik dla agentów): dopisane U1–U4.
