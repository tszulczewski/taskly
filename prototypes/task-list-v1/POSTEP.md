# Postęp: klikalny prototyp E01 z logowaniem (task-list-v1)

- Prompt: `lekcja-07/prompty/prompt-klikalny-prototyp.md`
- Mapa ekranów (zatwierdzona 2026-10-26): `prototypes/konta-i-role/mapa-ekranow.md`
- Szary prototyp: `.ai/prototypes/discovery/task-list-v1/revision-001/`
- Źródło prototypu: `prototypes/task-list-v1/` (w prompcie „taks-list-v1”, przyjęte jako literówka)
- Wynik budowania: `packages/ui/.storybook/public/prototypes/task-list/` → `/prototypes/task-list/index.html` w Storybooku (folder jest w `.gitignore`)
- Log przebiegu: `.ai/runs/2026-10-26-clickable-prototype-task-list.md` (etapy 0–1), `.ai/runs/2026-10-27-clickable-prototype-task-list-stage-2.md` (etapy 2–3), `.ai/runs/2026-10-27-spec-updates-from-prototype.md` (odpowiedzi na pytania do specyfikacji)
- 2026-10-27 właściciel wkleił prompt `lekcja-07/klikalny-prototyp-devmentor.txt` (wersja DevMentora, te same zasady 1–8) i wskazał `prototypes/konta-i-role/POSTEP.md`, którego nie ma. Wybrał: kontynuować ten prototyp od etapu 2, katalog i adres bez zmian.

## Etapy

| Etap | Stan | Data |
|---|---|---|
| 0. Plan | zatwierdzony („dalej A”: z silnikiem przeglądu) | 2026-10-26 |
| 1. Szkielet i ścieżka bez błędów | zrobiony; właściciel kazał kontynuować etapem 2 | 2026-10-26 |
| 2. Stany, role i scenariusze | zatwierdzony („dalej”) | 2026-10-27 |
| 3. Uczciwość i sprawdzenie | zrobiony; raport poniżej | 2026-10-27 |

## Etap 0: plan

### Technologia i uruchomienie

- React 19 + Vite 8 + Tailwind 4 (`@tailwindcss/vite`), wszystko już jest w `node_modules` repozytorium. Bez nowych zależności, bez własnego `package.json` (prototyp nie jest workspace'em, więc nie zmienia lockfile'a).
- Komponenty i tokeny: import `@taskly/ui` (alias Vite na `packages/ui/src/index.ts`) i `packages/ui/src/styles/index.css` + `@source` na źródła prototypu. Nic nie jest kopiowane z design systemu.
- JSX przez wbudowany w Vite 8 oxc (brak `@vitejs/plugin-react` w repo; do budowania niepotrzebny).
- Nawigacja: hash `#s01`…`#s08` (identyfikatory z mapy), stan `sNN.M` wybierany z paska przeglądu albo wywoływany kliknięciem.
- Budowanie: `node_modules/.bin/vite build --config prototypes/task-list-v1/vite.config.ts`, `base: "./"`, wynik do folderu Storybooka.
- Podgląd: Storybook (`cd packages/ui && npx storybook dev … --port 3000`) → `/prototypes/task-list/index.html`.
- Testy nawigacji: Vitest z osobnym configiem w katalogu prototypu (główny `vitest.config.mts` łapie tylko `packages/**`, więc progi 100% aplikacji ich nie dotyczą) + przejście w agent-browser.

### Kolejność budowy

1. Etap 1: szkielet (router, pasek przeglądu, zegar demo, symulowany serwer, sklep danych w pamięci), potem ścieżka bez błędów: s01 → s04 → s04.7/s04.10 (#15-AC1 1 500–2 000 zł) → s05 → s07 (#16-AC1 300–400 zł) → s06 → s08 → wylogowanie → s01; s02 (K3) → s04.3; s03.
2. Etap 2: stany błędów, ładowania, wyścigów i bramki dostępu ze scenariuszy P01–P12, konta K1–K4.
3. Etap 3: notatki przy ekranach, README, testy, przejście w przeglądarce.

### Kontrolki scenariuszy (pasek przeglądu, osobno od produktu)

P01 rejestracja · P02 wynik logowania · P03 wynik rejestracji · P04 sesja · P05 ładowanie listy · P06 odpowiedź serwera + opóźnienie · P07 wylogowanie · P08 zestaw danych · P09 wyścigi · P11 widok (320/768/1440, reduced motion) · P12 ładowanie strony. P10 wycofany (L01). Do tego: konto (K1–K4), wybór ekranu i stanu, motyw, „Reset”, oznaczenie „Prototyp”, zegar demo.

### Konta demo

K1 gość · K2 Marta Zielińska `marta@taskly.test` · K3 Jan Kowal `jan@taskly.test` (pusta lista) · K4 Ewa Lis `ewa@taskly.test` (jedno zadanie). Dane z sekcji 3 mapy.

### Luki w design systemie (propozycja)

Patrz tabela w rozmowie z etapu 0; ostateczna lista w raporcie etapu 3.

## Uruchomienie (od etapu 1)

```bash
node_modules/.bin/vite build --config prototypes/task-list-v1/vite.config.ts   # z katalogu głównego repo
cd packages/ui && npx storybook dev --config-dir .storybook --port 6006 --no-open --ci --disable-telemetry
# http://localhost:6006/prototypes/task-list/index.html
```

## Etap 1: co jest zrobione

### Pliki

- `index.html`, `vite.config.ts`, `tsconfig.json`: wejście, budowanie do folderu Storybooka, typy.
- `silnik/`: kopia `lekcja-07/silnik-przegladu/` (`prototype.js`, `prototype.css`, `README.md` bez zmian; `comments.js` z `prototypeId: 'task-list-v1'`; `mostek.css` przepisany na tokeny Taskly).
- `src/main.tsx`, `src/app.tsx`: strona przeglądu, każdy ekran mapy to stała `section.screen` (umowa silnika).
- `src/review-bar.tsx`, `src/review.css`: pasek przeglądu (ekrany, P01, motyw, reset, zegar demo) i style klas silnika z tokenów.
- `src/store.tsx`, `src/data.ts`, `src/server.ts`: stan demo w pamięci strony, konta K2 i K4, dane listy K2, symulowany serwer (600 ms, zawsze sukces).
- `src/screens/*`: s01 (`SignInScreen`), s02/s03 (`SignUpScreen`, `SignUpClosedScreen`), s04–s08 (`TaskScreen`).
- `src/presets.ts`: s05–s08 to widoki w s04; po wejściu prototyp otwiera wiersz / menu „…” / formularz tak, jak zrobiłaby to osoba.

### Decyzje podjęte przy budowie

- Komunikaty i walidacja z przykładów design systemu (`packages/ui/.storybook/blocks/task-data.ts`, `fake-api.ts`), importowane bez zmian (L14: teksty DS obowiązują).
- Tekst pustego stanu z L22 przekazany przez `text` komponentu (domyślny tekst DS jest inny).
- K3 nie istnieje przed rejestracją: konto Jana tworzy formularz s02 (s02.11). Rejestracja z emailem K2 lub K4 daje „Could not create the account.”.
- Etap 1 nie ma bramek: bez sesji ekrany s04–s08 pokazują listę K2. Bramki (s04.1, s01.9, s02.10, s03.2) w etapie 2.
- Ekran opuszczony montuje się od nowa (zamyka menu i okna, czyści formularze); dane zostają w stanie demo.
- Zmiany w repo poza katalogiem prototypu: `.prettierignore` (3 pliki silnika, których nie wolno edytować).

### Sprawdzone (agent-browser 0.39.1, Storybook :6006, `/prototypes/task-list/index.html`)

- s01 → logowanie K2 → s04 z 4 zadaniami (zrzuty `evidence/stage1-01-s01.png`, `stage1-02-s04.png`).
- s04.7/s04.9/s04.10: zadanie 1 500–2 000 zł, wiersz „Saving…”, potem na końcu listy, fokus w tytule (`stage1-03-s04-pending.png`).
- s07: podzadanie 300–400 zł pod „Decorative wall”, rodzic dalej 350–660 zł (#16-AC1, AC2).
- s06: zapis edycji, wiersz zmienia się po potwierdzeniu, fokus wraca na „…”.
- s08: „Delete “Decorative wall” and its 6 subtasks?”, „Deleting…”, wiersz znika, fokus na liście.
- s04.17: „Sign out” → s01. P01 → link „Create an account” → s02 → konto Jana → s04.3 z tekstem L22 i fokusem w „New task” (`stage1-06-empty-320.png`).
- Bezpośrednie linki `#s05`–`#s08` otwierają widoki na świeżej stronie.
- Silnik: komentarz przypięty do `h1` na s04, licznik w pasku, panel wątków, eksport widoczny (`stage1-07-comment-light.png`). Motyw jasny działa w produkcie i w pasku.
- 320 px: brak przewijania w poziomie; pasek przeglądu 236 px (rzędy przewijane w bok).
- `tsc -p prototypes/task-list-v1`, `eslint prototypes/task-list-v1`, `prettier --check prototypes/task-list-v1`: bez błędów.

### Znane ograniczenia po etapie 1

- Okno usuwania (s08) jest modalne i zasłania pasek przeglądu; najpierw „Cancel” albo Escape.
- Komentarzy nie da się przypiąć do menu i okien (Radix renderuje je poza `.frame`).
- Przycisk „← Back” silnika jest przyklejony w lewym dolnym rogu i na telefonie zasłania kawałek treści.

## Uwagi z komentarzy (eksport Markdown, 2026-10-26)

- s01: karta „zbyt szeroka”, pola „bardzo wysokie i szerokie”, „bardzo duże przyciski”; s04: wiersz „karykaturalnie za duże pola”.
- Pomiar przy 1440 px: karta 649 px (65ch), pole 42 px, przycisk 44 px, wiersz 68 px, kolumna 980 px. Wszystko z tokenów DS (K1 wariant A, F1, T10).
- Decyzja właściciela: zmiana w design systemie, nie w prototypie. Zatwierdzone liczby (decyzje V1–V2 w `packages/ui/POSTEP.md`, etap 9): od 640 px kontrolki 36 px, wiersz 52 px, szkielet listy z jednym paskiem; karta logowania 400 px; telefon bez zmian; kolumna 980 px bez zmian.
- Wdrożone 2026-10-26. Prototyp przebudowany; zmierzone po zmianie:

| | 320 px | 768 px | 1440 px |
|---|---|---|---|
| karta logowania | 288 | 400 | 400 |
| przycisk / oko hasła | 44 / 44 | 36 / 36 | 36 / 36 |
| wiersze s04 (K2) | 68, 87, 69, 69 | 52, 58, 53, 53 | 52, 58, 53, 53 |
| „…” | 44 | 36 | 36 |
| pasek aplikacji | 55 | 47 | 47 |

  Zrzuty: `evidence/v1-s01-1440.png`, `evidence/v1-s04-{320,768,1440}.png`. Notka „Prototype:” pod kartą ma teraz szerokość karty (`max-w-auth-card`).

### Druga runda uwag (2026-10-26)

- „Po najechaniu na pierwsze i ostatnie zadanie ostry narożnik 90°”: błąd w `TaskRow` design systemu, poprawiony (tony wiersza idą za zaokrągleniem listy), test regresji. Zmierzone: narożniki 12 px przy otwartym pierwszym i ostatnim wierszu.
- „Bardzo surowe obramowania inputów”: decyzja V3, jeden kolor `#748079` dla obu motywów (kontrast 3,4–4,5 zamiast 5,3–7,6). Zrzuty `evidence/v3-s01-1440-{dark,light}.png`, `evidence/v3-s06-320-{dark,light}.png`.
- „Podzadania powinny się wyróżniać”: porównanie w Storybooku, Product › Tasks › Proposals › Subtask hierarchy (warianty A–E, dwie historie: jak w prototypie oraz z checkboxem i uchwytem). Zrzuty `evidence/subtasks-*.png`. Decyzja: A, bez zmian (V4 w `packages/ui/POSTEP.md`); historia porównania usunięta.
- Na prośbę właściciela prototyp pokazuje uchwyt przeciągania i checkbox (porządek E02, ukończenie E03), choć mapa ekranów obejmuje E01. Logika z `packages/ui/.storybook/blocks/TaskScreen.tsx` (`reorder`, `setCompleted`, `forDisplay`): zmiana od razu, serwer symulowany zawsze potwierdza; ukończone na końcu, ponownie otwarte na początku, zadanie z otwartymi podzadaniami pyta w oknie. Poniżej 640 px uchwytu nie ma (długie przytrzymanie, G2). Sprawdzone przy 1440 i 320 px: ukończenie, okno, „Move up”, ponowne otwarcie, s05–s08 jak wcześniej, brak przewijania w poziomie. Zrzuty `evidence/e23-*.png`.

## Etap 2: rozszerzenie o porządek i ukończenie (decyzja właściciela 2026-10-26)

Etap 2 obejmuje też stany przeciągania i ukończenia. Mapa ich nie ma, więc dostaną nowe identyfikatory po ostatnim istniejącym (s04.21); żaden istniejący identyfikator się nie zmienia. Zachowanie i teksty z design systemu (`TaskScreen`, `taskMessages`, decyzje G1–G3, I3, 2026-10-21). Dopisane w mapie 2026-10-27 (sekcja 1, „Rozszerzenie s04”):

| Stan | Co widać |
|---|---|
| s04.22 | przeciąganie: uchwyt od 640 px, długie przytrzymanie na telefonie, klawiatura (spacja, strzałki, Escape) z ogłoszeniami czytnika ekranu |
| s04.23 | „Move up” / „Move down” w „…”; fokus zostaje na wierszu |
| s04.24 | przesunięcie odrzucone: wiersz wraca, w wierszu „Could not move “…”. It is back where it was.” |
| s04.25 | ukończenie: wiersz przekreślony, na końcu listy, fokus na jego checkboxie; podzadanie zmienia „1/3” rodzica |
| s04.26 | ukończenie zadania z otwartymi podzadaniami: okno „Complete “…” and its N open subtasks?” |
| s04.27 | ponowne otwarcie: wiersz na początku, jego podzadania zostają ukończone |
| s04.28 | ukończenie lub ponowne otwarcie odrzucone: wiersz wraca, w wierszu „Could not save “…”. It is back as it was.” |
| s04.29 | ukończonego nie da się przesunąć: bez uchwytu, bez „Move up / Move down” |

Przełączniki: P06 (potwierdza / odmawia / nie odpowiada, opóźnienie) obejmie też przesunięcie i ukończenie; P09 „konflikt pozycji 409” dotyczy przesunięcia.

## Etap 2: co jest zrobione (2026-10-27)

### Jak to działa

- **Pasek przeglądu** (osobno od produktu): „Reload screen”, „Reset prototype”, motyw, zegar demo, zdanie przewodnika (po wyborze stanu), a pod spodem zwijany blok „Account, states and scenarios” (konto K1–K4, „Go to state”, P01–P12) z bieżącym kontem i liczbą zmienionych przełączników w nagłówku. Konto i przewodnik są w bloku od 2026-10-27 (odpowiedź 5).
- **„Go to state”**: każdy z 83 stanów (77 z mapy + s04.22–s04.29; s04.13 i s07.7 są na liście wyszarzone, bo zostają testami API, L01). Wybór ustawia przełączniki na domyślne plus to, czego stan potrzebuje, loguje właściwe konto (K1 na stronach logowania, K2 na liście), przywraca listę konta do danych z mapy (albo zestaw P08) i otwiera ekran od nowa. W pasku pojawia się zdanie, co kliknąć (`src/states.ts`).
- **Otwarcie strony a zmiana widoku**: przejście z innej strony, „Reload screen”, zmiana konta = strona otwiera się od nowa (P12, potem P05). Przejścia między s04–s08 to widoki tej samej strony i niczego nie ładują.
- **Przełączniki**: P01 rejestracja; P02 wynik logowania; P03 wynik rejestracji; P04 sesja (przy K1 „none”); P05 ładowanie listy; P06 odpowiedź na zmiany + opóźnienie 0–3 s (dodaj, edytuj, usuń, przesuń, ukończ; logowanie i rejestracja też czekają tyle); P07 wylogowanie; P08 podmiana listy zalogowanego konta; P09 wyścigi (jednorazowo, potem wraca na „none”); P11 widok; P12 ładowanie strony. Jednorazowe są też „fails once…” w P05 i P07: po pierwszej porażce przełącznik sam wraca na sukces, widać to w pasku.
- **Bramki dostępu** (s04.1, s01.9, s02.10, s03.2) i P01 na s02/s03: zamiast przekierowania ekran pokazuje kartę „Prototype · access gate …” z tym, co robi aplikacja, i przyciskami („Go to sign-in”, „Sign in as Marta (K2)”, „Go to the task list”, „Sign out (K1)”). Prawdziwe przekierowanie zapętlałoby „← Back” silnika (wraca na ekran, który znowu przekierowuje). Bramki „ta strona wymaga innej roli” nie ma: w wersji 1 jest tylko właściciel (L19).
- **Dane zostają po błędzie**: formularze DS trzymają wpisany tekst po odmowie serwera (s01, s02, szybkie dodawanie, edycja, podzadanie); przesunięcie i ukończenie wracają do stanu sprzed zmiany z komunikatem w wierszu. Wyjątek z mapy: po 401 (s04.14) tekst przepada.
- **Alt+Shift+R** przeładowuje bieżący ekran, także z otwartego okna (np. P06 „never answers” przy usuwaniu: okno modalne zasłania pasek, a w trakcie usuwania nie da się go zamknąć).

### Decyzje podjęte przy budowie

- s06.8 / s07.6: design system nie umie zamknąć formularza z zewnątrz i zostawić komunikatu w miejscu wiersza. Komunikat z mapy („This task was deleted. The list has been refreshed.”) pokazuje się w formularzu, po 3 s odświeżona lista nie ma już zadania, fokus idzie na listę. Wzorzec DS (DetailsInRow, „Not found or no access”) robi to samo, ale ma inny tekst („This task no longer exists. It may have been deleted in another tab.”); użyłem tekstu z zatwierdzonej mapy.
- s04.12 (409 przy dodawaniu) ma ten sam tekst co s04.11 („Could not add the task. Try again.”, L14). 409 przy przesunięciu daje komunikat s04.24.
- s04.21: nagłówek „My renovation” (odpowiedź 3: „na razie”), `ErrorState` bez listy i bez szybkiego dodawania (L13); działa „Sign out” i motyw. „Try again” powtarza otwarcie według bieżącego P12.
- s04.18 (zła odpowiedź) wygląda jak s04.4 i tak samo nie przechodzi przy ponowieniu.
- s02.3: limity 100 znaków imienia i 128 hasła dodane w prototypie do przykładowej walidacji DS; teksty „Use at most 100 characters.” / „Use at most 128 characters.” zatwierdzone przez właściciela 2026-10-27 (nie ma ich jeszcze w specyfikacji ani w DS).
- s02.7: po odmowie formularz zostaje z komunikatem, a P01 przełącza się na „zamknięta” (następna wizyta na /sign-up to s03).
- s01.7: limit 3 prób na 10 s nie jest liczony; 429 włącza P02.
- Sign-out nie sprawdza P04: Better Auth odpowiada 200 także bez sesji (lekcja 2026-10-16).
- P11: szerokości otwierają nowe okno 320/768/1440 px (stan demo zaczyna się tam od nowa, komentarze są wspólne, bo leżą w przeglądarce). Breakpoint DS to media query, więc zwężenie ramki w tej samej stronie nic by nie pokazało. „Reduced motion” prototyp tylko odczytuje (ustawienie systemu albo DevTools), bo media query nie da się przełączyć ze strony.
- P12 „did not open” dotyczy tylko listy; strony logowania nie mają takiego stanu w mapie.
- Zestaw P08 „30 tasks” to nazwy K2 z numerami („Curtain rods 2”…) i jedno zadanie z tytułem 200 i opisem 2000 znaków złożonymi ze słów z briefu (`manyTasks` w `src/data.ts`). Bez nowych nazw i kwot.

### Pliki

- Nowe: `src/scenarios.ts` (przełączniki i ich wartości), `src/states.ts` (przewodnik po 83 stanach), `src/page-open.ts` (P12 na stronach logowania), `src/screens/gate.tsx`, `src/screens/auth-skeleton.tsx` (luka DS03).
- Zmienione: `src/app.tsx` (otwarcie strony, przeładowanie, przewodnik, Alt+Shift+R), `src/store.tsx` (scenariusze, sesja, konta, zestawy danych), `src/server.ts` (P04/P06), `src/review-bar.tsx`, `src/review.css`, `src/data.ts` (K3, 30 zadań), `src/screens/sign-in.tsx`, `sign-up.tsx`, `task-screen.tsx`.
- Mapa: `prototypes/konta-i-role/mapa-ekranow.md`, sekcja 1, dopisane „Rozszerzenie s04” (s04.22–s04.29).

### Sprawdzone (agent-browser 0.39.1; Storybook nie działał, więc folder `packages/ui/.storybook/public` serwowany przez `python3 -m http.server 6107`, ten sam adres `/prototypes/task-list/index.html`)

- s01: P02 złe dane / 429 / brak sieci (komunikaty z SI, email zostaje w polu); „Signing in…” przy 3 s; s01.9 bramka; s01.11 po 401 i zniknięcie zdania po zalogowaniu; s01.12 szkielet karty 2 s.
- s02: s02.3 (100/128 znaków, zły email), s02.5–s02.9 (każdy komunikat, imię zostaje w polu), s02.7 przełącza P01, s02.11 Jan → K3, pusta lista, fokus w tytule; s02.10 i s03.2 bramki; bramki P01 na s02/s03.
- s04: s04.2 szkielet, s04.4 + ponowienie, s04.5 „Trying again…” → lista, s04.18, s04.21 (ponowienie przy „failed” i po zmianie P12), P12 „slow” (szkielet bez szybkiego dodawania), s04.9/s04.10 (wiersz „Saving…”, fokus w tytule), s04.11 (tekst zostaje), s04.12 (P09 wraca na „none”), s04.14 → s01.11, s04.16 → ponowienie → s01, s04.19 (30 wierszy, tytuł 200 znaków), s04.1 bramka i „Sign in as Marta”.
- s04.22 klawiaturą (Spacja, strzałka w górę, Spacja: „Pantry wall finish” wyżej, fokus na uchwycie), s04.24 (menu „Move up”, odmowa: wiersz wraca z komunikatem), 409 przy przesunięciu, s04.26 okno z 5 podzadaniami, s04.28 (ukończenie odrzucone, wiersz wraca).
- s06.3, s06.4 (tekst zostaje), s06.8; s07.4 (podzadanie 300–400 zł, rodzic dalej 350–660 zł), s07.6; s08.4 („Deleting…”, fokus na liście), s08.5 (komunikat w oknie, Cancel → fokus na „…”), s08.7 (K4: fokus na pustym stanie).
- P06 „never answers”: wiersz dodawania zostaje do przeładowania, po „Reload screen” znika; okno usuwania zablokowane, Alt+Shift+R otwiera ekran od nowa, Escape zamyka okno.
- P11: przycisk otwiera okno `width=320` z bieżącym adresem (sprawdzone podmianą `window.open`; samego okna headless nie pokazuje).
- 320 px, jasny motyw: brak przewijania w poziomie na s01.11, s02.7, s03.1, s04.19, s04.21, s04.1, s05.2, s06.8, s07.1, s08.2. Pasek przeglądu 377 px wysokości (etap 1: 236 px; doszły konto, przewodnik, jego zdanie i zwinięty blok scenariuszy).
- Klawiatura w pasku: Tab dochodzi do selectów, „Reload screen”, przełącznika motywu i „Scenarios P01–P12”; Enter otwiera blok, Spacja zaznacza P01.
- `tsc -p prototypes/task-list-v1`, `eslint prototypes/task-list-v1`, `prettier --check prototypes/task-list-v1 prototypes/konta-i-role`, `vite build`: bez błędów.
- Zrzuty: `evidence/stage2-01…10-*.png` (pasek i s04.24, s04.21, s01.11, s01.12, s04.1, s06.8 przy 1440 ciemny; pasek, s04.24, s04.1, s02.7 przy 320 jasny).

### Niesprawdzone

- Przeciąganie myszą i długie przytrzymanie na telefonie (headless; logika jest z DS i jej testów).
- Prawdziwe okno P11 i `prefers-reduced-motion: reduce` (emulacja w DevTools).
- Czytnik ekranu.

### Luki w design systemie (etap 2)

- **DS03**: `AuthCard` nie ma stanu ładowania; w prototypie karta z nagłówkiem i paskami `Skeleton` (`src/screens/auth-skeleton.tsx`, oznaczone w kodzie).
- **G-REVIEW-BAR** (rozszerzone): brak komponentu Select; pasek używa natywnego `<select>` z klasą `.input` silnika (to narzędzie przeglądu, nie produkt).
- **Nowa uwaga do DS**: `ErrorState` przekazuje `data-slot="error-state"` do `Alert`, który nadpisuje go swoim `data-slot="alert"` (ten sam mechanizm co lekcja z 2026-10-23 o `Surface`), więc `[data-slot="error-state"]` niczego nie znajduje.
- Komunikat „zadanie usunięte” w miejscu wiersza (s06.8) nie ma wzorca w DS; patrz decyzja wyżej.

## Odpowiedzi właściciela (2026-10-27)

1. s06.8 / s07.6: obowiązuje tekst z mapy („This task was deleted. The list has been refreshed.”); zachowanie (komunikat w formularzu, po 3 s wiersz znika) zostaje. Wzorzec DS (DetailsInRow) ma inny tekst; do wyrównania przy specyfikacji.
2. s02.3: teksty „Use at most 100 characters.” i „Use at most 128 characters.” zatwierdzone; do dopisania w specyfikacji logowania.
3. s04.21: na razie z nagłówkiem „My renovation”. Wdrożone.
4. Bramki jako karta przeglądu zamiast przekierowania: zostają.
5. Konto i „Go to state” przeniesione do zwijanego bloku. Pasek przy 320 px: 288 px (z podpowiedzią stanu 334 px, z rozwiniętym blokiem 1680 px); przy 1440 px: 194 px. Brak przewijania w poziomie przy 320 i 1440 px. Zrzuty: `evidence/stage2-11-bar-folded-320.png`, `evidence/stage2-02-s04.21-1440-dark.png` (podmieniony).

## Etap 3: co jest zrobione (2026-10-27)

### Pliki

- `src/screens.ts` + `src/app.tsx`: pod każdym ekranem notatka `.notes > .note` (umowa silnika): „Stories”, „Simulated”, „Not decided here”. Silnik chowa notatki w trybie prezentacji (domyślnym); `src/review.css` je pokazuje, bo prompt chce notatki przy każdym ekranie (pliki silnika bez zmian).
- `README.md`: uruchomienie, korzystanie, konta demo, przełączniki P01–P12, „Ograniczenia symulacji”, pliki.
- `src/navigation.test.tsx` + `vitest.config.mts` (osobny config, nie wchodzi do `npm test` aplikacji): 13 testów na całej stronie przeglądu z prawdziwym silnikiem w jsdom: start na s01, każdy ekran z listy ekranów, notatki na każdym ekranie, bramka s04.1 → s01, „← Back”, link `#s03`, logowanie → s04 → s01.9 → wylogowanie → s01, złe hasło zostaje na s01, s01 → s02 → rejestracja Jana → s04 pusta (K3), s02 przy zamkniętej rejestracji → s03 → s01, „Go to state” dla ekranów s01–s08, wygaśnięcie sesji → s01.11, zmiana konta bez zmiany ekranu. Sprawdzone, że testy potrafią się wyłożyć (kopia z dwiema błędnymi asercjami: 2 porażki).
- `tsconfig.json`: dołączony `vitest.config.mts`.

### Sprawdzone w przeglądarce (agent-browser 0.39.1, statyczny serwer na :6107)

- **Każdy przycisk i link** w ramkach ekranów (s01.2, s01.9, s02.1, s02.10, s03.1, s03.2, s04.1, s04.4, s04.6, s04.21, s05.2, s06.1, s07.1, s08.2; razem ok. 190 kliknięć, każde na świeżo otwartym ekranie): każde kliknięcie zmienia stronę, fokus albo ekran. Bez reakcji na samo kliknięcie są tylko uchwyty „Move …” (działają przeciągnięciem i Spacją, tak jak w DS; przeciąganie myszą sprawdzone: „Sow the rest of the lawn” na górę) i kliknięcie już wybranego motywu.
- **Bramki P01** na s02 i s03 („Go to s02/s03”, „Open/Close sign-up”), pasek przeglądu („Reload screen”, „Reset prototype”, motyw) i przyciski silnika („Comment”, „Clickable”, „Show hotspots”, „Threads”, „Hide pins”, „Presentation”, „← Back”).
- **Każda wartość każdego przełącznika**: P01–P12 sprawdzone w etapie 2, uzupełnione teraz: P03 „email already used”, P07 „fails” (zostaje „fails”, komunikat za każdym razem), P08 „K2's list” po pustej, P06 1,5 s, P11 768 i 1440 px (podmiana `window.open`).
- **Klawiatura**: logowanie (Tab, Enter), szybkie dodawanie (Enter, fokus wraca do tytułu), Tab do „…”, menu strzałkami (pierwsze zadanie: Add subtask, Edit, Move down, Delete; „Move up” zablokowane), Edit → fokus w tytule → Enter zapisuje → fokus na „…”, Escape w edycji oddaje fokus na „…”, Delete → okno z fokusem na „Cancel” → Escape → fokus na „…”, Enter na tytule otwiera wiersz, „Sign out” Enterem → s01. Obwódka fokusu: 2 px na przyciskach i ramce pola.
- **320 i 1440 px × jasny i ciemny**: wszystkie 8 ekranów bez przewijania w poziomie, motyw zgodny z wyborem (32 kombinacje). Zrzuty `evidence/stage3-s01-*.png`, `evidence/stage3-s04-*.png`.
- `tsc`, `eslint prototypes/task-list-v1`, `prettier --check`, `vitest` (13/13), `vite build`: bez błędów. `npm run lint` w repozytorium: 0 błędów (1 ostrzeżenie w `.agents/skills/…`, nie z tej pracy).

### Niesprawdzone

- Długie przytrzymanie na telefonie (headless nie ma dotyku), prawdziwe okna P11, `prefers-reduced-motion: reduce`, czytnik ekranu, inne przeglądarki niż Chromium.
- Kontrast i axe na stronie prototypu (komponenty mają testy axe w Storybooku; pasek przeglądu i notatki ich nie mają).

## Raport końcowy (etapy 0–3)

### Luki w design systemie

| ID | Luka | Co zrobił prototyp |
|---|---|---|
| DS03 | `AuthCard` bez stanu ładowania | karta z `Skeleton` (`src/screens/auth-skeleton.tsx`) |
| DS04 | brak historii „strona nie wstała” | `AppShell` + `ErrorState` złożone w prototypie (s04.21) |
| — | komunikat w miejscu usuniętego wiersza (s06.8, s07.6) | komunikat w formularzu, po 3 s wiersz znika |
| — | `ErrorState` traci `data-slot` (nadpisuje go `Alert`) | szukać po `role="alert"` |
| G-REVIEW-BAR | brak paska narzędzi i komponentu Select dla narzędzi spoza produktu | flex na tonie `raised`, natywny `<select>` z klasą silnika |
| G-REVIEW-TOAST | Taskly celowo nie ma toastów | krótkie powiadomienia silnika w ramce z tokenów |
| G-REVIEW-STATUS | brak kolorów sukcesu i ostrzeżenia | „rozwiązane” w kolorze akcji, „niezapisane” wyciszone |

### Pytania do specyfikacji, które wyszły przy budowie

1. Tekst 404 przy edycji i dodawaniu podzadania: mapa („This task was deleted. The list has been refreshed.”, zatwierdzony 2026-10-27) i wzorzec DS DetailsInRow („This task no longer exists. It may have been deleted in another tab.”) się różnią; trzeba wyrównać DS i dopisać tekst do specyfikacji zadań.
2. Teksty limitów rejestracji („Use at most 100 characters.”, „Use at most 128 characters.”) zatwierdzone; do dopisania w specyfikacji logowania.
3. s04.21 z nagłówkiem „My renovation” „na razie”: ostateczna decyzja przy specyfikacji (L13).
4. 409 przy dodawaniu ma ten sam tekst co odmowa (L14); specyfikacja mówi „Please try again” bez rozstrzygnięcia, czy pokazać tekst serwera.
5. Limit logowania „3 próby na 10 s” (SI-Edge): czy ekran ma mówić, ile czekać? Teraz tylko ogólne „Wait a few seconds”.
6. Kolejność i ukończenie (s04.22–s04.29) są w prototypie na prośbę właściciela, ale należą do E02/E03; przy ich specyfikacjach przenieść stany z rozszerzenia mapy.
7. SI-Q3 („English UI”) do zmiany (L04: docelowo polski) i poprawki z mapy w #15 (L03, L09, L18) czekają na wpisanie do specyfikacji i issues.

## Odpowiedzi na pytania do specyfikacji (właściciel, 2026-10-27)

„1. zrób to 2. zrób to 3. ostatecznie tak 4. pokaz tekst z serwera 5. tak 6. przenieś 7. wpisz”. Log: `.ai/runs/2026-10-27-spec-updates-from-prototype.md`.

1. Tekst 404 z mapy jest w specyfikacji zadań (UI/UX, Edge cases) i we wzorcu DS `DetailsInRow` (historia i opis).
2. Teksty limitów rejestracji są w specyfikacji logowania („Field errors”) i w `validateSignUp` w DS (`.storybook/blocks/fake-api.ts`); prototyp używa ich stamtąd, bez własnej kopii.
3. s04.21 z nagłówkiem „My renovation” jest ostateczne: specyfikacja zadań, stan „Page did not open”; z prototypu, mapy i README zniknęło „na razie”.
4. 409 przy dodawaniu: formularz pokazuje tekst serwera („Please try again”); specyfikacja zadań i prototyp (s04.12).
5. Limit prób: „Too many attempts. Try again in N seconds.” z nagłówka `X-Retry-After` Better Auth (bez niego ogólny tekst); specyfikacja logowania (Messages, API, Edge cases, testy kroku 3 i 8), DS (`rateLimitedIn`, `SignInForm`) i prototyp (P02, P03: stałe 8 s).
6. s04.22–s04.29 są w `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md` (wejście do specyfikacji E02-S01 i E03-S01); w mapie został odsyłacz, identyfikatory bez zmian.
7. SI-Q3 zmienione (L04). #15 na GitHubie: AC1 i AC2 w formacie DS (L18), AC4 potwierdzone i nowe AC6 „obie kwoty albo żadna” (L03), edycja i usuwanie wyjęte z „Out of scope” (L09), sekcja „Changes”. W specyfikacji zadań poprawione też L07 (opis tylko w otwartym wierszu, akcje w „…”), L08 (optymistyczne tylko dodanie) i L22 (tekst pustego stanu).

## Rozszerzenie 2026-10-28: suma podzadań i dokładna cena

Krok 4 zadania z 2026-10-28 (log: `.ai/runs/2026-10-28-e01-subtask-rollup-alignment.md`). Mapa: sekcja „Rozszerzenie: suma podzadań i dokładna cena”, zatwierdzona przez właściciela 2026-10-28 („zatwierdzam”, L23 = A). Komponenty z PR #37 (`QuickAdd` w jednym wierszu, `TaskForm` z `summedEstimate`, `TaskRow` z licznikiem i komunikatem, `EstimateRange` z jedną kwotą).

- **Ekran zadań** (`src/screens/task-screen.tsx`):
  - lista pokazuje sumę podzadań, liczoną w stronie tak jak serwer przy odczycie (`rollUp` z `.storybook/blocks/task-data.ts`);
  - pierwsze podzadanie zadania z wpisaną kwotą i usunięcie ostatniego podzadania wpisują komunikat do wiersza (s07.9, s07.10, s08.8); każda następna zmiana go czyści;
  - edycja zadania z podzadaniami zachowuje jego własną kwotę (R15);
  - P09 „zadanie dostało podzadanie w innej karcie”: 409 przy zapisie zmienionej kwoty, lista dostaje podzadanie „Bathroom” bez szacunku (s06.12);
  - walidacja: próbka DS (`validateTask`); brakował w niej limit opisu 2000 znaków ze specyfikacji, bez którego s04.33 był nieosiągalny, więc dopisałem go w DS (PR #37, `bbe676a`, z historią „Description Too Long”).
- **Dane K2** (L23 = A): opisy uchwytu TV i szafki RTV bez „Not included in the wall estimate”, opis ściany „Living room. Without the sockets”. „Decorative wall” pokazuje 700–1 400 zł i „3 subtasks without an estimate”; wpisane 350–660 zł wraca po usunięciu podzadań.
- **Przewodnik po stanach**: 18 nowych stanów; zastąpione (s04.7, s05.3, s06.7, s07.1, s07.4) są w liście wyłączone z dopiskiem „replaced by …”, wskazówki dawnych stanów mówią „Amount” i „up to”.
- **Notatki ekranów** s04–s08: kryteria po przepisaniu #15 i #16.
- **Testy nawigacji**: 17 (było 13): suma i licznik (s04.34), dodanie podzadania do sumy (s07.11), błąd opisu otwiera przełącznik (s04.33), 409 (s06.12).

### Przejście w agent-browser (2026-10-28, wynik budowania z `python3 -m http.server`)

| Stan | Szerokość, motyw | Wynik | Zrzut |
|---|---|---|---|
| s04.34 | 1440, ciemny | „Decorative wall 700–1 400 zł”, „0/5 3 subtasks without an estimate”; szybkie dodawanie: tytuł 480 px, kwoty po 182 px, „Add” 63 px, wszystko na górze 373 px, wysokość 36 px | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-01-s04.34-1440-dark.png` |
| s04.31 | 1440, ciemny | samo „Amount” 500 → nowy wiersz „500 zł”, fokus wraca do tytułu | — |
| s04.32 | 1440, ciemny | 2000 i 1500 → „“Up to” must not be less than the amount.” pod „up to”, fokus tam | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-02-s04.32-1440-dark.png` |
| s07.9 | 1440, ciemny | pierwsze podzadanie 300–400 zł pod „Pantry wall finish” → zadanie 300–400 zł i komunikat `role="status"` pod tytułem | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-03-s07.9-1440-dark.png` |
| s08.8 | 1440, ciemny | usunięcie tego podzadania → 770–1 210 zł i „The estimate of “Pantry wall finish” is back to your amount: 770–1 210 zł.” | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-04-s08.8-1440-dark.png` |
| s06.9 | 1440, ciemny | edycja „Decorative wall”: „Sum of subtasks: 700–1 400 zł”, „Change the amounts on the subtasks.”, bez pól kwot | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-05-s06.9-1440-dark.png` |
| s06.12 | 1440, ciemny | kwota 900 i nowy tytuł → komunikat 409, „Sum of subtasks: no estimate yet”, tytuł zostaje; drugi zapis zapisuje tytuł, wiersz „No estimate” i „1 subtask without an estimate” | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-06-s06.12-1440-dark.png` |
| s04.30 | 320, jasny | tytuł 288×44, „Amount” i „up to” obok siebie po 140×44, „Add” 63×44 pod nimi, „Description” niżej; bez poziomego przewijania (szerokość strony 320) | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-07-s04.30-320-light.png` |
| s07.8 | 320, jasny | „New subtask”, kwoty, „Add”, „Description” i „Cancel”; bez poziomego przewijania | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-08-s07.8-320-light.png` |
| s04.33 | 320, jasny | opis 2200 znaków wpisany z klawiatury, przełącznik zamknięty, Enter w tytule → przełącznik się otwiera, komunikat „Enter at most 2 000 characters.”, fokus w opisie (także przy 1440 i przy „Add”) | `/var/www/taskly/prototypes/task-list-v1/evidence/rollup-09-s04.33-320-light.png` |

### DS08 wycofane

Pierwsze przejście s04.33 wstawiło opis skryptem (setter `value` i zdarzenie `input`) i pokazało fokus w tytule; zgłosiłem to jako lukę DS08. Właściciel przyjął poprawkę w PR #37. Przed poprawką historia „Description Too Long” w Storybooku (Chromium, klik „Add” i Enter) i powtórzone przejście z tekstem wpisanym z klawiatury (1440 i 320 px) pokazały fokus w opisie: design system działa, błąd wywołało wstawianie skryptem. Poprawki nie było; zostały historia i limit w próbce walidacji (`bbe676a`).

## Pytania otwarte

- brak
