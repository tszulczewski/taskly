# Mapa ekranów: Epik 01 z logowaniem (prototyp klikalny)

- Data: 2026-10-26
- Status: **zatwierdzona** przez właściciela produktu 2026-10-26. Niczego jeszcze nie zbudowano. Odpowiedzi właściciela z 2026-10-26 (dwie tury) są wpisane w sekcji 7; wszystkie luki są rozstrzygnięte.
- Rozszerzenie 2026-10-28 (kwoty po odświeżeniu briefu z 2026-10-27: R12–R18, D22–D24, C1): sekcja „Rozszerzenie: suma podzadań i dokładna cena”. **Zatwierdzone** przez właściciela 2026-10-28, z L23 w wariancie A (sekcja 7).
- Przepływ: logowanie, rejestracja (otwarta i zamknięta), wylogowanie, strona główna `/` z zadaniami i podzadaniami (Epik 01).
- Materiały: `.ai/specs/product-brief.md`, `.ai/specs/backlog.md`, `.ai/specs/2026-10-16-sign-in-pages.md` (dalej **SI**), `.ai/specs/2026-10-16-tasks-and-subtasks.md` (dalej **TS**), `.ai/specs/research/personas.md`, `packages/ui` (komponenty, Storybook, `POSTEP.md`), `.ai/docs/design-system.md`, `AGENTS.md`. Kryteria akceptacji pochodzą z issue #15, #16 i #24 na GitHubie (backlog nie ma osobnych plików historii).
- Stałe identyfikatory: ekrany `s01`–`s08`, stany `sNN.M`, scenariusze `P01`–`P11`, konta `K1`–`K4`, luki w specyfikacji `L01`–`L22`, luki w design systemie `DS01`–`DS07`. Nie zmieniam ich, bo przypinamy do nich komentarze.
- Uwaga o nazwach: design system używa własnych nazw ekranów S1–S8 (Storybook, `Product/…/Screens`). Podaję je w nawiasie przy każdym ekranie, żeby dało się je porównać, ale do komentarzy służą tylko `sNN`.

## 0. Historie i kryteria akceptacji w tym przepływie

| Kod | Źródło | Treść (skrót) |
|---|---|---|
| #15-AC1 | E01-S01 (#15) | Zalogowany właściciel dodaje zadanie z tytułem, opisem, min 1500.00 i max 2000.00 PLN; pojawia się na liście z zakresem w PLN (D14, D16, R07). |
| #15-AC2 | #15 | Kwota z groszami, np. 12.50, zapisuje się jako 1250 groszy i wraca jako 12.50 PLN (R01). |
| #15-AC3 | #15 | Puste pole szacunku: zadanie zapisuje się bez szacunku (R10). |
| #15-AC4 | #15 | Min większe od max: zapis odrzucony z komunikatem przy polu („odczytanie agenta, do potwierdzenia”). |
| #15-AC5 | #15 | Dodanie zadania do listy, do której właściciel nie należy: odmowa jako „nie znaleziono”. |
| #16-AC1 | E01-S02 (#16) | Dodane podzadanie z opisem i zakresem pojawia się pod zadaniem (D15, D21). |
| #16-AC2 | #16 | Zadanie 1000–2000, podzadanie 300–400: zadanie dalej pokazuje 1000–2000 (R06). |
| #16-AC3 | #16 | Edycja szacunku podzadania nie zmienia zadania ani podsumowania (R06). |
| #16-AC4 | #16 | Dodanie podzadania do cudzego zadania: odmowa. |
| #24-DW1 | Phase A logowania (#24), „Done when” | Niezalogowany na `/` trafia na `/sign-in`; po zalogowaniu ląduje na `/`; po wylogowaniu stare ciasteczko nie działa. |
| #24-DW2 | #24 | Przy zamkniętej rejestracji `/sign-up` pokazuje komunikat o zamknięciu, a bezpośredni POST jest odrzucany. |
| #24-DW3 | #24 | Ścieżki odmowy (złe hasło, limit 429, zamknięta rejestracja), nieudane wylogowanie (bez fałszywego sukcesu) i odnawianie sesji mają testy. |
| SI-Q1, Q3, Q4, Q7, Q8, Q10 | SI, decyzje | Rejestracja domyślnie zamknięta; UI po angielsku; rejestracja pyta o imię; po zalogowaniu zawsze `/`; bez „Remember me”; przełącznik pokazywania hasła. |
| SI-Msg | SI, UI/UX, tabela komunikatów | Złe dane logowania, limit prób, zajęty email, odrzucone dane rejestracji, nieudane wylogowanie, błąd sieci. |
| SI-Edge | SI, Edge Cases | Przekierowania, wygaśnięcie sesji, wylogowanie bez sesji. |
| TS-UI | TS, UI/UX | Szybkie dodawanie, wiersz zadania, edycja, usuwanie, walidacja, stany (ładowanie, pusto, błąd), aktualizacje optymistyczne. |
| TS-Edge | TS, Edge Cases | Kwoty, wyścigi, wygaśnięcie sesji, zła odpowiedź serwera. |

Poza przepływem, choć dotykają tych samych ekranów: E02 (kolejność, markery, miejsca), E03 (ukończenie, przyszłe wydatki), Phase B logowania (reset hasła skryptem, bez UI). Prototyp ich nie pokazuje (wyjątek: pytanie L02).

## 1. Ekrany

Rola „właściciel” oznacza zalogowanego użytkownika, który jest `owner` swojej jedynej, domyślnej listy (TS: `ensureDefaultList`). W wersji 1 nie ma innych ról w UI (D02, N02); patrz „Role i dostęp” pod tabelą.

| ID | Ekran | Rola | Stany (źródło) | Historia lub kryterium | Komponenty DS |
|---|---|---|---|---|---|
| s01 | Logowanie `/sign-in` (DS S1) | gość niezalogowany | **s01.1** domyślny, rejestracja zamknięta: bez linku „Create an account” (SI-Q1, SI-UI) · **s01.2** domyślny, rejestracja otwarta: link „Create an account” (SI-Q1) · **s01.3** hasło pokazane okiem i ukryte po wysłaniu (SI-Q10) · **s01.4** błędy pól: pusty email lub hasło, zły email (SI-UI „Field errors”, `signInInput`) · **s01.5** ładowanie: wysyłanie, „Signing in…”, przycisk zablokowany (SI-UI „While submitting”) · **s01.6** błąd: „Email or password is incorrect.” (SI-Msg, #24-DW3) · **s01.7** błąd: „Too many attempts. Wait a few seconds and try again.” (429; SI-Msg, #24-DW3) · **s01.8** błąd sieci lub inny: „Something went wrong. Try again.” (SI-Msg) · **s01.9** brak dostępu odwrotnie: zalogowany jest odsyłany na `/` (SI-Edge) · **s01.10** sukces: przejście na s04, zawsze `/` (SI-Q7, #24-DW1) · **s01.11** po wygaśnięciu sesji: spokojne zdanie (przygaszony tekst, `role="status"`, nie `Alert`; DS02) nad formularzem „Your session has expired. Sign in again.” (L10, decyzja agenta) · **s01.12** ładowanie strony przed odczytem sesji: szkielet karty (L12) · pusty: nie dotyczy · konflikt: nie dotyczy · usługa zewnętrzna: nie dotyczy, w v1 logowanie nie woła żadnej (Better Auth działa w aplikacji) · bez odzyskiwania hasła (L16) | #24-DW1, #24-DW3, SI-Q1, Q7, Q8, Q10 | `AuthCard`, `SignInForm` (`FormField`, `Input`, `PasswordInput`, `Button` z `loading`, `Alert`, `Link`) |
| s02 | Rejestracja otwarta `/sign-up` (DS S2) | gość niezalogowany, tylko przy `ALLOW_SIGN_UP=true` | **s02.1** domyślny: imię, email, hasło z podpowiedzią „At least 10 characters”, link „Sign in” (SI-Q4, SI-UI; DS E11) · **s02.2** hasło pokazane okiem (SI-Q10) · **s02.3** błędy pól: imię puste, ze spacji lub ponad 100 znaków; zły email; hasło krótsze niż 10 lub dłuższe niż 128 znaków (SI krok 2, `signUpInput`) · **s02.4** ładowanie: „Creating account…”, przycisk zablokowany (SI-UI) · **s02.5** konflikt: email już użyty (422) → „Could not create the account.”, bez potwierdzania, że email istnieje (SI-Msg) · **s02.6** błąd: serwer odrzucił dane (400 `INVALID_SIGN_UP_INPUT`) → „Check your details and try again.” (SI-Msg) · **s02.7** błąd: rejestrację zamknięto, gdy formularz był otwarty (400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`): `Alert` nad formularzem „Sign-up has been turned off. Ask the owner of this Taskly.” (L11) · **s02.8** błąd: 429 (SI-Msg) · **s02.9** błąd sieci (SI-Msg) · **s02.10** brak dostępu odwrotnie: zalogowany → `/` (SI-Edge) · **s02.11** sukces: konto od razu zalogowane, s04 z pustą listą (SI-UI, TS-UI „Empty”) · **s02.12** ładowanie strony: szkielet karty (L12) · usługa zewnętrzna: nie dotyczy (bez weryfikacji maila, SI-Q2) | SI-Q1, Q2, Q4, Q10, SI-Msg | `AuthCard`, `SignUpForm` (`FormField` z `hint`, `Input`, `PasswordInput`, `Button`, `Alert`, `Link`) |
| s03 | Rejestracja zamknięta `/sign-up` (DS S3) | gość niezalogowany, przy domyślnym `ALLOW_SIGN_UP` | **s03.1** domyślny: „Sign-up is closed. Ask the owner of this Taskly.” i link „Sign in”, bez formularza (SI-UI, #24-DW2) · **s03.2** brak dostępu odwrotnie: zalogowany → `/` (SI-Edge) · **s03.3** ładowanie strony: szkielet karty (L12) · pozostałe stany: nie dotyczy | #24-DW2, SI-Q1 | `AuthCard`, `SignUpClosed` (`Link`) |
| s04 | Lista zadań `/` w powłoce aplikacji (DS S4 + S5) | właściciel | **s04.1** brak dostępu: niezalogowany jest odsyłany na s01, zanim załaduje się cokolwiek z danych (SI-Edge, #24-DW1, TS-UI) · **s04.2** ładowanie: trzy statyczne wiersze szkieletu (TS-UI „Loading”) · **s04.3** pusty: „No tasks yet. Start with one task. Only the title is required.”, fokus w polu tytułu (TS-UI „Empty”, tekst zmieniony w L22) · **s04.4** błąd ładowania: „Could not load your tasks.” i „Try again” (TS-UI „Error”); **s04.5** ponawianie: „Trying again…” (DS `ErrorState`) · **s04.6** domyślny: zadania z szacunkiem „1 500–2 000 zł” i bez („No estimate”), liczba podzadań w drugiej linii (#15-AC1, #15-AC3, TS-UI „Task row”) · **s04.7** szybkie dodawanie z rozwiniętym „Details”: opis, min, max w zł (TS-UI „Quick add”) · **s04.8** błędy pól szybkiego dodawania: brak tytułu; „Enter an amount like 1 500,50”; „Min must not exceed max”; „Enter both amounts or neither”; kwota ponad 10 000 000 zł (#15-AC4, TS-UI „Validation”, TS-Edge) · **s04.9** dodawanie w toku: wiersz tymczasowy na końcu, wyszarzony, „Saving…”, akcje zablokowane (TS-UI „Optimistic updates”) · **s04.10** dodane: wiersz na końcu, przewinięty i chwilę podświetlony (bez animacji przy `prefers-reduced-motion`), fokus wraca do tytułu (TS-UI „After an add”, #15-AC1, #15-AC2) · **s04.11** dodanie odrzucone: wiersz znika, komunikat nad formularzem (TS-UI, TS-Edge „Network failure”) · **s04.12** konflikt: dwa szybkie dodania naraz → 409; formularz pokazuje tekst serwera „Please try again”, wpisany tekst zostaje (TS-Edge, TS-UI; właściciel 2026-10-27) · **s04.13** brak dostępu: dodanie do cudzej listy → 404 (#15-AC5); **poza prototypem**, zostaje testem API (L01) · **s04.14** sesja wygasła w trakcie: 401 → s01.11, wpisany tekst przepada (SI-Edge, TS-Edge, L10) · **s04.15** wylogowanie w toku: przycisk „Sign out” zajęty (SI-UI „Sign-out”) · **s04.16** wylogowanie nieudane: „Could not sign out. Try again.” w nagłówku, strona zostaje, można ponowić (SI-UI, SI-Edge, #24-DW3) · **s04.17** sukces wylogowania: s01 (SI-UI) · **s04.18** zła odpowiedź serwera (`bad_response`) → stan s04.4 (TS-Edge) · **s04.19** dużo danych: 30 zadań, tytuł 200 znaków, opis 2000 znaków (DS „Many Tasks”, decyzja U1; TS limity pól) · **s04.20** motyw ciemny i jasny (DS); zapis wyboru na koncie poza wersją 1 (L06) · **s04.21** strona nie wstała (błąd przy otwarciu `/`, zanim jest lista): powłoka z działającym „Sign out” i `ErrorState` „Could not open your tasks.” z „Try again” oraz nagłówkiem „My renovation” (L13; zatwierdzone ostatecznie przez właściciela 2026-10-27, TS-UI „Page did not open”) · nagłówek `h1` to nazwa listy, w v1 bez zmiany nazwy (L21) · usługa zewnętrzna: nie dotyczy (AI to wersja 2, D11) · praca bez sieci: poza zakresem (L17) | #15-AC1–AC5, #24-DW1, #24-DW3, TS-UI, TS-Edge | `AppShell`, `AppHeader`, `ThemeToggle`, nagłówek `h1` z nazwą listy, `QuickAdd`, `TaskList`, `TaskRow`, `EstimateRange`, `Skeleton`, `EmptyState`, `ErrorState`, `Alert`, `Collapsible`, `TextAction`, `Surface` |
| s05 | Zadanie otwarte w wierszu (widok w s04; DS S6) | właściciel | **s05.1** zamknięte: tytuł, szacunek, „N subtasks” (DS Luki 6) · **s05.2** otwarte: opis, wcięte podzadania z własnym szacunkiem, „Add subtask” (#16-AC1, TS-UI; DS Luki 6, decyzja J1) · **s05.3** szacunek rodzica obok szacunków podzadań bez zmian (#16-AC2) · **s05.4** menu „…”: Add subtask, Edit, Delete; podzadanie bez „Add subtask”, bo poziom jest jeden (TS-UI, TS Q5) · **s05.5** wiersz w toku: akcje w „…” zablokowane (TS-UI, decyzja „pending rows”) · **s05.6** zadanie bez opisu i bez podzadań: po otwarciu tylko „Add subtask” (DS) · **s05.7** długi tytuł rośnie w dół (DS U1) · opis tylko w otwartym wierszu, akcje w „…”: wersja DS zatwierdzona (L07) | #16-AC1, #16-AC2 | `TaskRow` (`Collapsible`, `Menu`, `MenuTrigger`, `MenuItem`, `Tooltip`, `TextAction`, `EstimateRange`) |
| s06 | Edycja w miejscu: zadanie lub podzadanie (widok w s04) | właściciel | **s06.1** domyślny: ten sam formularz, wypełniony (TS-UI „Edit”) · **s06.2** błędy pól jak s04.8 (TS-UI „Validation”) · **s06.3** zapisywanie: „Saving…” w formularzu, wiersz zmienia się dopiero po potwierdzeniu (DS „Optimistic change”, L08) · **s06.4** zapis odrzucony: formularz zostaje otwarty z wpisanym tekstem i komunikatem nad nim (DS, L08) · **s06.5** wyczyszczone obie kwoty usuwają szacunek, wiersz pokazuje „No estimate” (TS-UI „Edit”) · **s06.6** „Cancel” lub Escape: wiersz wraca, fokus na „…” (DS „Inline edit”) · **s06.7** edycja szacunku podzadania nie zmienia rodzica (#16-AC3) · **s06.8** zadanie usunięte w innej karcie → 404: formularz pokazuje „This task was deleted. The list has been refreshed.”, lista się odświeża i wiersz znika, fokus przechodzi na listę (L15; tekst i miejsce zatwierdzone 2026-10-27, TS-UI) | #16-AC3, TS-UI | `TaskForm` (`FormField`, `Input`, `Textarea`, `TaskFields`, `Button`, `Alert`) |
| s07 | Dodawanie podzadania (widok w s05) | właściciel | **s07.1** domyślny: „New subtask” z „Details” i „Cancel”, Escape anuluje (TS-UI; DS `QuickAdd` z `onCancel`) · **s07.2** błędy pól jak s04.8 · **s07.3** w toku: wiersz tymczasowy na końcu podzadań (TS-UI „After an add”) · **s07.4** dodane: podzadanie pod zadaniem, szacunek rodzica bez zmian (#16-AC1, #16-AC2) · **s07.5** odrzucone: wycofanie i komunikat (TS-UI) · **s07.6** rodzic usunięty w międzyczasie → 404 (TS-Edge): jak s06.8, komunikat i odświeżenie listy (L14, L15) · **s07.7** brak dostępu: cudze zadanie → odmowa (#16-AC4): **poza prototypem**, zostaje testem API (L01) · podpodzadanie: nie dotyczy, UI go nie oferuje (TS-Edge, 409) | #16-AC1, #16-AC2, #16-AC4 | `QuickAdd` (z `onCancel`), `TaskRow` |
| s08 | Potwierdzenie usunięcia (okno nad s04) | właściciel | **s08.1** zadanie bez podzadań: „Delete “…”?” (TS-UI „Delete”) · **s08.2** z podzadaniami: „Delete “…” and its N subtasks?” (TS-UI) · **s08.3** podzadanie (TS-UI, wiersz podzadania ma „Delete”) · **s08.4** usuwanie: „Deleting…” w oknie, wiersz znika po potwierdzeniu (DS, L08) · **s08.5** usunięcie nieudane: „Could not delete the task. Try again.” w oknie (DS) · **s08.6** „Cancel” lub Escape: fokus wraca na „…” (TS-UI „Accessibility”) · **s08.7** usunięto ostatnie zadanie: s04.3, fokus na pustym stanie (DS O4) | TS-UI „Delete” | `DeleteTaskDialog` (`ConfirmDialog` w wariancie `danger`) |

### Rozszerzenie s04: porządek i ukończenie (przeniesione do E02/E03)

Stany s04.22–s04.29 (przeciąganie, „Move up / Move down”, ukończenie, ponowne otwarcie) dopisano 2026-10-27 na prośbę właściciela. Należą do E02 i E03. Tego samego dnia właściciel przeniósł je do pliku decyzji dla specyfikacji E02-S01 i E03-S01: `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md`, sekcja „Screen states from the clickable prototype”. Identyfikatory się nie zmieniają, a prototyp nadal te stany pokazuje.

P06 obejmuje też przesunięcie i ukończenie; konflikt pozycji 409 z P09 dotyczy dodania (s04.12) i przesunięcia (s04.24). Liczby z sekcji 6 dotyczą mapy bez rozszerzenia; z nim s04 ma 29 stanów, a prototyp pokazuje **83**.

### Rozszerzenie: suma podzadań i dokładna cena (2026-10-28, zatwierdzone)

Odświeżenie briefu z 2026-10-27 zastępuje R06–R08, D15 i D16: szacunek zadania z podzadaniami to suma ich szacunków (R12–R15, D22, D23), dokładną cenę wpisuje się raz (R18, D24), a szybkie dodawanie pokazuje kwoty obok tytułu (prototyp odkrywczy C1). Źródła: spec E01 w rewizji 2026-10-28 (dalej **TS**), przepisane kryteria #15 i #16, design system (`packages/ui/POSTEP.md`, Etap 10, decyzje W1–W4). Identyfikatory się nie zmieniają: stany, których reguła wypadła, zostają z dopiskiem „zastąpiony”, a nowe dostają kolejne numery.

#### Aktualne kryteria (przepisane 2026-10-28)

| Kod | Treść (skrót) |
|---|---|
| #15-AC1 | „Amount” 1 500 zł i „up to” 2 000 zł → wiersz „1 500–2 000 zł” (D23, R16). |
| #15-AC4 | „Amount” większe od „up to” → „“Up to” must not be less than the amount.” pod „up to”. |
| #15-AC6 | Jedna kwota (w dowolnym polu) → dokładna cena, min = max, jedna kwota, np. „500 zł” (R18, D24). Zastępuje „Enter both amounts or neither” (L03). |
| #15-AC7 | Tytuł, „Amount” i „up to (optional)” w jednym wierszu bez otwierania czegokolwiek; opis za zwijanym „Description” (C1, W4). |
| #16-AC2 | Zadanie 1 000–2 000 zł, podzadania 300–400 zł i 500 zł → zadanie 800–900 zł; po usunięciu obu podzadań znów 1 000–2 000 zł (R12, R15). |
| #16-AC3 | Podzadania 300–400 zł i jedno bez szacunku → 300–400 zł i „1 subtask without an estimate”; wszystkie bez szacunku → „No estimate” (R13). |
| #16-AC4 | Edycja szacunku podzadania zmienia szacunek zadania; formularz zadania nie ma pól kwot (R12). |
| #16-AC5 | Podzadanie do cudzego zadania → „nie znaleziono” (dawne #16-AC4; poza prototypem, L01). |

#### Stany zastąpione (id zostają, prototyp już ich nie pokazuje)

| Stan | Co wypadło | Zastępuje go |
|---|---|---|
| s04.7 | szybkie dodawanie z rozwiniętym „Details” | s04.30 |
| s04.8 (część) | „Min must not exceed max”, „Enter both amounts or neither”; reszta s04.8 obowiązuje | s04.32 |
| s05.3 | szacunek rodzica bez zmian obok podzadań (R06) | s05.8 |
| s06.7 | edycja podzadania nie zmienia rodzica (R06) | s06.10 |
| s07.1 | „New subtask” z „Details” | s07.8 |
| s07.4 | po dodaniu podzadania szacunek rodzica bez zmian (R06) | s07.9, s07.11 |

#### Nowe stany

| Stan | Ekran | Co widać | Źródło |
|---|---|---|---|
| s04.30 | s04 | Szybkie dodawanie w jednym wierszu: od 640 px „New task”, grupa „Estimate (optional)” z „Amount” i „up to (optional)” (sufiks „zł”) oraz „Add”; poniżej 640 px kwoty pod tytułem. Pod wierszem zwinięty „Description” ze strzałką; po dodaniu się zwija, fokus wraca do tytułu. | #15-AC7, TS-UI „Quick add”, C1, DS W4 |
| s04.31 | s04 | Dokładna cena: wpisana tylko jedna kwota (w dowolnym polu); wiersz pokazuje jedną kwotę, np. „500 zł”. Obie równe kwoty dają to samo. | #15-AC6, TS-Edge, R18, D24 |
| s04.32 | s04 | Błędy kwot: „“Up to” must not be less than the amount.” pod „up to”; „Enter an amount like 1 500,50” pod polem z błędną kwotą. | #15-AC4, TS-UI „Validation” |
| s04.33 | s04 | Błąd opisu przy zwiniętym „Description” (opis ponad 2000 znaków, przełącznik zwinięty, Enter): przełącznik sam się otwiera, fokus w polu, komunikat „Enter at most 2 000 characters.”. | DS F9, W4 |
| s04.34 | s04 | Zadanie z podzadaniami pokazuje sumę ich szacunków, bez żadnego oznaczenia; w drugiej linii obok „N subtasks” przygaszone „N subtasks without an estimate”. Dane K2: „Decorative wall” 700–1 400 zł i „3 subtasks without an estimate”. | #16-AC3, TS-UI „Summed estimate”, R12, R13, DS W2 |
| s04.35 | s04 | Wszystkie podzadania bez szacunku: zadanie pokazuje „No estimate” i „N subtasks without an estimate”. Osiągalny kliknięciem: podzadanie bez kwot pod zadaniem bez podzadań (s07.10). | #16-AC3, TS-Edge, R13 |
| s05.8 | s05 | Otwarte zadanie z podzadaniami: przy zadaniu suma, przy podzadaniach ich własne kwoty albo „No estimate”. | #16-AC2, R12 |
| s06.9 | s06 | Edycja zadania z podzadaniami: zamiast pól kwot tekst „Sum of subtasks: 700–1 400 zł” (albo „Sum of subtasks: no estimate yet”) i „Change the amounts on the subtasks.”; tytuł i opis edytowalne. | #16-AC4, TS-UI „Edit”, DS W2 |
| s06.10 | s06 | Zapisana kwota podzadania zmienia sumę zadania w jego wierszu. | #16-AC4, R12 |
| s06.11 | s06 | Edycja dokładnej ceny: kwota w „Amount”, „up to” puste; wyczyszczenie „up to” w zakresie zapisuje jedną kwotę. | TS-UI „Edit”, R18 |
| s06.12 | s06 | Konflikt 409: zadanie dostało podzadanie w innej karcie, a właściciel zapisuje kwotę: formularz pokazuje „A task with subtasks takes its estimate from them”, zostawia wpisany tekst, lista się odświeża i pola kwot ustępują sumie. Nic nie zapisano, także tytułu; ponowny zapis wysyła tytuł. Przez P09. | TS-UI „Edit”, TS-Edge |
| s07.8 | s07 | Formularz podzadania w układzie szybkiego dodawania: „New subtask”, „Amount”, „up to (optional)”, „Add”; pod spodem „Description” i „Cancel”; Escape anuluje. Bez notatki, dokąd idą pieniądze. | TS-UI „Add subtask”, C1, DS W4 |
| s07.9 | s07 | Pierwsze podzadanie z kwotą pod zadaniem z wpisanym szacunkiem: szacunek zadania staje się sumą, a w jego wierszu pod tytułem przygaszona linia (`role="status"`): „The estimate of “…” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.” Znika przy następnej zmianie. | #16-AC2, TS-UI „Roll-up messages”, R12, R15, DS W1 |
| s07.10 | s07 | Pierwsze podzadanie bez kwot pod zadaniem z wpisanym szacunkiem: zadanie „No estimate” i „1 subtask without an estimate”, ten sam komunikat co s07.9. Zadanie bez własnej kwoty: bez komunikatu. | TS-Edge, R13, R15 |
| s07.11 | s07 | Kolejne podzadanie: suma rośnie, bez komunikatu. | #16-AC2, R12 |
| s08.8 | s08 | Usunięto ostatnie podzadanie zadania z zachowaną kwotą: wraca kwota, w wierszu przygaszona linia „The estimate of “…” is back to your amount: 350–660 zł.” | #16-AC2, TS-UI „Roll-up messages”, R15, DS W1 |
| s08.9 | s08 | Usunięto ostatnie podzadanie zadania, które nigdy nie miało własnej kwoty: „No estimate”, bez komunikatu. | TS-UI „Roll-up messages”, R15 |
| s08.10 | s08 | Usunięto jedno z kilku podzadań: suma zadania maleje. | R12 |

#### Scenariusze, dane, design system

- **P09** dostaje wartość „zadanie dostało podzadanie w innej karcie” (409 przy zapisie kwoty zadania, s06.12). Pozostałe nowe stany są osiągalne kliknięciem przy P06 „potwierdza”; „odmawia” i „nie odpowiada” działają jak w s04.11, s06.4, s07.5, s08.5.
- **Dane K2:** kwoty bez zmian (L20). Po R12 „Decorative wall” pokazuje sumę uchwytu TV i szafki RTV, 700–1 400 zł, a wpisane 350–660 zł jest zachowane i wraca po usunięciu wszystkich podzadań (s08.8). Opisy „Not included in the wall estimate” i „Without the TV cabinet, the TV mount…” przestały być prawdziwe (L23): uchwyt i szafka są bez opisu, a opis ściany to „Living room. Without the sockets”.
- Kwoty z kryteriów wpisuje się na żywo: #16-AC2 (zadanie 1 000–2 000 zł, podzadania 300–400 zł i 500 zł → 800–900 zł), #15-AC6 (jedna kwota).
- **Design system:** wszystko jest w `QuickAdd`, `TaskForm` (`summedEstimate`), `TaskRow` (`unestimatedSubtasks`, `notice`) i `EstimateRange` (PR #37). Przy budowie prototypu wyszła luka **DS08** (sekcja 5).
- **Poza prototypem** (należą do E03, nie do mapy E01): „Add estimate” wprost w wierszu (C5), lista zadań bez szacunku w przyszłych wydatkach (C4), „0 of 1 subtask done” (C7).
- **Liczby rozszerzenia:** 18 nowych stanów (s04: 6, s05: 1, s06: 4, s07: 4, s08: 3), 6 zastąpionych (s04.8 tylko w części). Prototyp pokazuje **96** stanów (83 − 5 zastąpionych w całości + 18 nowych). Luki: 1 nowa w specyfikacji (L23), 1 w design systemie (DS08, znaleziona przy budowie).

### Role i dostęp

- **Gość niezalogowany** widzi tylko s01, s02 albo s03 (zależnie od `ALLOW_SIGN_UP`). Każdy adres aplikacji, także `/`, odsyła go na s01 po stronie serwera, zanim dotrą dane (s04.1, SI-Edge).
- **Właściciel** (zalogowany) widzi s04–s08. Wejście na s01, s02 lub s03 odsyła go na `/` (s01.9, s02.10, s03.2).
- **Inny zalogowany użytkownik** ma własną listę domyślną i nigdy nie widzi cudzych zadań. Ponieważ `/` zawsze pokazuje listę zalogowanej osoby, a w adresie nie ma identyfikatora listy, odmowa z #15-AC5 i #16-AC4 nie ma ekranu (L01).
- **Edytor i obserwator** (`editor`, `viewer`) istnieją w warstwie autoryzacji (#6), ale wersja 1 nie ma udostępniania (N02), więc żaden ekran ich nie pokazuje (L19).
- Mentee, mentor i operator z przykładu w poleceniu nie dotyczą Taskly.

## 2. Scenariusze do przełączania w prototypie

To kontrolki prototypu (panel demo), nie funkcje produktu.

| ID | Przełącznik | Wartości | Stany, które wywołuje |
|---|---|---|---|
| P01 | Rejestracja | zamknięta (domyślnie) / otwarta | s01.1, s01.2, s02, s03 |
| P02 | Wynik logowania | poprawne / złe dane / limit 429 / brak sieci | s01.6–s01.8, s01.10 |
| P03 | Wynik rejestracji | poprawna / email zajęty / dane odrzucone / rejestrację zamknięto w trakcie / limit 429 / brak sieci | s02.5–s02.9, s02.11 |
| P04 | Sesja | brak / ważna / wygasa przy następnym wywołaniu API (401) | s04.1, s04.14, s01.9, s02.10, s03.2 |
| P05 | Ładowanie listy | szybkie / wolne (szkielet) / błąd / błąd, potem sukces / zła odpowiedź serwera | s04.2, s04.4, s04.5, s04.18 |
| P06 | Odpowiedź serwera na zmiany (dodaj, edytuj, usuń) | potwierdza / odmawia / nie odpowiada; opóźnienie 0–3 s | s04.9–s04.11, s06.3, s06.4, s07.3–s07.5, s08.4, s08.5 (jak `ServerMode` w `TaskScreen` w Storybooku) |
| P07 | Wylogowanie | udane / nieudane / nieudane, potem udane | s04.15–s04.17 |
| P08 | Zestaw danych | pełna lista (K2) / pusta lista (K3) / 30 zadań z długimi tekstami | s04.3, s04.6, s04.19 |
| P09 | Wyścigi | brak / zadanie usunięte w innej karcie (404 przy edycji lub dodaniu podzadania) / konflikt pozycji 409 | s04.12, s06.8, s07.6 |
| P10 | ~~Cudza lista lub zadanie~~ | **wycofany** (L01: prototyp zostaje przy własnej liście) | — |
| P11 | Widok | szerokość 320 / 768 / 1440 px; `prefers-reduced-motion`; język tylko EN (L04) | wszystkie ekrany |
| P12 | Ładowanie strony | szybkie / wolne (szkielet karty, szkielet listy) / strona nie wstała | s01.12, s02.12, s03.3, s04.21 |

## 3. Konta i dane demo

Wszystko fikcyjne. Domena `taskly.test` nie istnieje.

### Konta

| ID | Kto | Email / hasło | Lista | Do czego |
|---|---|---|---|---|
| K1 | gość niezalogowany | brak konta | brak | s01–s03, s04.1 |
| K2 | właściciel z listą: „Marta Zielińska” | `marta@taskly.test` / `remont-demo-2026` | „My renovation” z danymi poniżej | s04–s08; jego email służy też do konfliktu w s02.5 |
| K3 | właściciel tuż po rejestracji: „Jan Kowal” | `jan@taskly.test` / `pierwszy-dom-01` | „My renovation”, pusta | s02.11, s04.3 |
| K4 | drugi użytkownik: „Ewa Lis” | `ewa@taskly.test` / `druga-lista-02` | własna lista z jednym zadaniem „Paint the hallway” | izolacja (#15-AC5, #16-AC4) przez P10 |

Połączenia ról: w wersji 1 każde konto jest tylko `owner` swojej jednej listy, więc kont typu „właściciel jednej listy i edytor innej” nie ma (N02, L19).

### Dane listy K2 („My renovation”)

Nazwy pochodzą z briefu (Problems, Domain glossary). Kwoty zadań głównych podał właściciel 2026-10-26 jako przybliżenia (L20); zakresy wylosowano tak, że min i max odchodzą od podanej kwoty o 50–250 zł (decyzja właściciela). Kwoty podzadań podał właściciel.

| # | Zadanie / podzadanie | Opis | Szacunek | Skąd |
|---|---|---|---|---|
| 1 | Curtain rods | Bathroom, living room and dining room | 1 070–1 400 zł | nazwa i miejsca z briefu (D09); ok. 1 200 zł od właściciela (L20) |
| 2 | Decorative wall | Living room. Without the TV cabinet, the TV mount and the sockets | 350–660 zł | nazwa z briefu; ok. 600 zł i to, co jest poza nią, od właściciela (L20) |
| 2.1 | ↳ Priming | — | brak („No estimate”) | nazwa z briefu (glossary); R10 |
| 2.2 | ↳ Decorative plaster | — | brak („No estimate”) | nazwa z briefu; R10 |
| 2.3 | ↳ Impregnation | — | brak („No estimate”) | nazwa z briefu; R10 |
| 2.4 | ↳ TV mount | Not included in the wall estimate | 200–400 zł | nazwa z briefu; kwota od właściciela (L20) |
| 2.5 | ↳ TV cabinet | Not included in the wall estimate | 500–1 000 zł | nazwa i kwota od właściciela (L20) |
| 3 | Pantry wall finish | — | 770–1 210 zł | nazwa z briefu; ok. 1 000 zł od właściciela (L20) |
| 4 | Sow the rest of the lawn | Second bag of seed, prepare the soil again | 390–660 zł | sytuacja z briefu (Problems, trawa); ok. 500 zł od właściciela (L20) |

Kwoty z kryteriów nie są zapisane w danych, tylko wpisywane na żywo w scenariuszu demo: nowe zadanie 1 500–2 000 zł (#15-AC1), kwota 12,50 (#15-AC2), zadanie bez szacunku (#15-AC3), min > max (#15-AC4), podzadanie 300–400 zł pod zadaniem 1 000–2 000 zł i jego edycja (#16-AC1–AC3).

Zestaw „30 zadań” (P08) powtarza te nazwy z numerami i dodaje jedno zadanie z tytułem 200 znaków i opisem 2000 znaków.

### Zegar demo

- Stałe „teraz”: **poniedziałek 2026-10-26, 10:00 czasu warszawskiego (CET, UTC+01:00)**.
- Wersja 1 nie pokazuje dat (decyzja DS L2), więc zegar służy tylko sesjom i limitowi prób:
  - sesja K2 utworzona 2026-10-20 10:00, wygasa 2026-11-19 10:00 (30 dni, SI-Q5), ma ponad dobę, więc nadaje się do odnowienia;
  - sesja wygasła (P04): utworzona 2026-09-25 10:00, wygasła 2026-10-25 10:00;
  - limit logowania: 3 próby na 10 s (SI-Edge), liczone od „teraz”.
- Brief nie podaje terminów zadań i wersja 1 ich nie ma.

## 4. Luki w specyfikacji

Nie rozstrzygam ich. Przy każdej jest pytanie do właściciela produktu.

### Kryterium bez ekranu albo stanu

- **L01** — #15-AC5 i #16-AC4 (cudza lista, cudze zadanie) nie mają ekranu: `/` zawsze pokazuje listę zalogowanej osoby, a w adresie nie ma identyfikatora listy ani zadania. Odmowa istnieje tylko w API.
  **Pytanie:** Czy te kryteria zostają wyłącznie testami API, czy prototyp ma pokazać ten stan przełącznikiem P10? Jeśli tak, co widzi właściciel, gdy dodanie zwróci 404?
- **L02** — #16-AC3 mówi, że „podsumowanie” się nie zmienia, ale w Epiku 01 nie ma podsumowania: przyszłe wydatki to E03-S02 (DS S8).
  **Pytanie:** Czy prototyp E01 ma pokazać linię przyszłych wydatków, czy ta część kryterium należy do E03 i trzeba ją przenieść?
- **L03** — #15-AC4 jest opisane jako „odczytanie agenta, do potwierdzenia”, a TS dodaje regułę „Enter both amounts or neither”, której nie ma w żadnej historii.
  **Pytanie:** Potwierdzasz obie reguły (min ≤ max oraz obie kwoty albo żadna) jako kryteria #15?

### Stan potrzebny w przepływie, którego nie opisuje żadne kryterium

- **L10** — Po wygaśnięciu sesji (s04.14) właściciel ląduje na s01 bez słowa wyjaśnienia, a wpisany tekst przepada (TS akceptuje utratę tekstu).
  **Pytanie:** Czy s01 ma wtedy powiedzieć, że sesja wygasła? Jeśli tak, jakim zdaniem?
- **L11** — SI w tabeli API wymienia błąd `EMAIL_PASSWORD_SIGN_UP_DISABLED` jako obsługiwany przez UI, ale tabela komunikatów nie ma dla niego tekstu (s02.7).
  **Pytanie:** Co widzi osoba, której formularz rejestracji był otwarty, gdy rejestrację zamknięto: komunikat nad formularzem (jaki?) czy przejście na s03?
- **L12** — Strony s01–s04 czytają sesję wewnątrz `<Suspense>`, ale nikt nie opisał, co widać, zanim odczyt się skończy.
  **Pytanie:** Co pokazujemy w tym czasie: nic (puste tło), szkielet karty logowania, a może samą powłokę?
- **L13** — Gdy serwer nie zdoła przygotować `/` (np. baza nie odpowiada przy `ensureDefaultList`), nie ma listy ani `ErrorState`, bo błąd zdarza się przed nimi. Brak ekranu błędu strony.
  **Pytanie:** Jaki ekran wtedy widać: ogólną stronę błędu, `ErrorState` w powłoce z „Try again”, coś innego?
- **L14** — Brakuje tekstów komunikatów: brak tytułu, kwota ponad 10 mln zł (TS mówi tylko „Field error”), nieudane dodanie i zapis, 409 „Please try again” (czy pokazać tekst z serwera?), 404 przy dodawaniu podzadania do usuniętego zadania, błędy pól logowania i rejestracji (zły email, imię). Design system ma własne przykłady („Enter a title.”, „Enter at most 10 000 000 zł”, „Could not add the task. Try again.”; decyzja E3).
  **Pytanie:** Czy teksty z design systemu stają się obowiązujące i trzeba je dopisać do specyfikacji, czy podasz inne?
- **L15** — Edytowane zadanie usunięto w innej karcie (s06.8): zapis zwraca 404, a nie wiadomo, co dalej.
  **Pytanie:** Czy formularz zostaje z komunikatem, czy wiersz znika z listy po odświeżeniu? Jakie zdanie widzi właściciel?
- **L16** — Zapomniane hasło: s01 nie ma żadnej wskazówki, a reset istnieje tylko jako skrypt na serwerze (Phase B, po wdrożeniu).
  **Pytanie:** Czy s01 ma cokolwiek mówić o zapomnianym haśle, czy przy jednym właścicielu zostawiamy to bez słowa?
- **L17** — `AGENTS.md` mówi, że na telefonie aplikacja działa jako PWA, ale żadna specyfikacja E01 nie opisuje pracy bez sieci poza „błąd sieci, spróbuj ponownie”.
  **Pytanie:** Czy prototyp ma pokazać stan offline albo instalację PWA, czy to poza wersją 1?

### Sprzeczność między specyfikacją, briefem i design systemem

- **L04** — Język. SI-Q3: „English UI. Amounts keep Polish formatting.” Design system: polski to główny język produktu, w wersji 1 język z przeglądarki przy pierwszej wizycie (decyzja L3). TS pisze komunikaty po angielsku, a nazwa listy „My renovation” jest stała.
  **Pytanie:** W jakim języku ma być prototyp i wersja 1? Czy język z przeglądarki (L3) dotyczy też ekranów logowania i nazwy listy?
- **L05** — Nagłówek. SI: `AppHeader` pokazuje „user name + sign out”. `AppHeader` w design systemie ma nazwę aplikacji, przełącznik motywu i „Sign out”, bez imienia. Imię z rejestracji (SI-Q4) nie jest nigdzie pokazane.
  **Pytanie:** Czy imię ma być w nagłówku? Jeśli nie, do czego służy pole „Name” w rejestracji?
- **L06** — Przełącznik motywu (`ThemeToggle`, ciemny domyślnie) jest w design systemie, ale nie ma go w briefie ani w żadnej specyfikacji.
  **Pytanie:** Czy przełącznik motywu należy do wersji 1 i prototypu? Gdzie zapamiętujemy wybór (w przeglądarce czy na koncie)?
- **L07** — Wiersz zadania. TS: opis w wierszu (dwie linie, rozwijany), akcje „Add subtask”, „Edit”, „Delete” widoczne w wierszu. Design system (Luki 6, P2): opis tylko po otwarciu wiersza, akcje w „…”. Design system zapisał „poprawić UI/UX specyfikacji”, ale TS dalej mówi swoje.
  **Pytanie:** Zatwierdzasz wersję z design systemu i poprawkę TS?
- **L08** — Edycja i usuwanie. TS: optymistyczne (edycja od razu zmienia wiersz, usunięcie od razu go zabiera, wycofanie przy błędzie). Design system („Optimistic change”): od razu widać tylko dodanie (oraz w E02/E03 ruch, marker i ukończenie); edycja i usunięcie czekają na serwer w formularzu lub oknie, a błąd zostaje w oknie.
  **Pytanie:** Które zachowanie obowiązuje dla edycji i usuwania?
- **L09** — Zakres #15. Issue #15 ma „Out of scope: editing and deleting (not stated in the brief)” i otwarte pytanie, czy są potrzebne. TS je zawiera (decyzje z grillingu), brief o nich milczy.
  **Pytanie:** Potwierdzasz, że edycja i usuwanie należą do E01? Czy poprawić treść #15?
- **L18** — Format kwot. #15-AC1 i AC2: „1500.00 PLN”, „12.50 PLN”. TS: „12,50 zł”. Design system (F11): „1 500–2 000 zł”, grosze tylko gdy nie są zerem. `formatPlnRange` w kodzie daje jeszcze trzeci wariant („1200,00 zł – 1500,00 zł”).
  **Pytanie:** Czy obowiązuje zapis z design systemu i trzeba poprawić kryteria #15?

### Decyzja, której nikt nie podjął

- **L19** — Role. Warstwa autoryzacji ma `owner`, `editor` i `viewer`, a wersja 1 pokazuje tylko właściciela (N02). Folder prototypu nazywa się „konta-i-role”.
  **Pytanie:** Czy prototyp pokazuje tylko gościa i właściciela, czy też widok innej roli (np. obserwatora bez edycji) jako przygotowanie do wersji 2?
- **L20** — Dane demo. Brief nie podaje żadnych kwot poza przykładami w kryteriach, a wywiad mówi, że kwot nie liczono.
  **Pytanie:** Podasz przybliżone kwoty swoich prawdziwych zadań (karnisze, ściana dekoracyjna, spiżarnia, trawnik), czy zostają wymyślone kwoty z sekcji 3?
- **L21** — Nagłówek strony. Design system pokazuje nazwę listy „My renovation” jako `h1`. TS tworzy listę o tej nazwie, ale nie mówi, że jest widoczna, a zmiana nazwy listy nie ma UI.
  **Pytanie:** Czy nazwa listy ma być nagłówkiem strony? Jeśli tak, czy właściciel może ją zmienić w wersji 1?
- **L22** — Pierwsze wejście po rejestracji (s02.11 → s04.3): persony P01 i P02 boją się wpisywania wielu danych (personas.md, H1), a pusty stan zachęca tylko do pierwszego zadania.
  **Pytanie:** Czy pusty stan zostaje taki jak w TS, czy chcesz w nim coś więcej (bez nowych funkcji, np. inny tekst)?

## 5. Luki w design systemie

- **DS01** — `AppHeader` nie ma miejsca na imię użytkownika (dotyczy, jeśli w L05 odpowiesz „tak”).
- **DS02** — `Alert` ma tylko odmianę błędu (`role="alert"`). Nie ma spokojnej informacji, np. „sesja wygasła” na s01 (L10), a `SignInForm` nie przyjmuje komunikatu z zewnątrz, tylko z wyniku wysłania.
- **DS03** — Brak stanu ładowania stron logowania (szkielet `AuthCard` albo pusta karta) na czas odczytu sesji (L12).
- **DS04** — Brak całostronicowego błędu poza listą: `ErrorState` jest przewidziany do listy, a `AppShell` wymaga obsługi wylogowania i motywu, więc nie wiadomo, czy wolno go użyć na stronie, której dane nie doszły (L13).
- **DS05** — `TaskList` i `TaskRow` nie mają widoku tylko do odczytu (bez szybkiego dodawania i „…”) dla roli `viewer` (dotyczy, jeśli w L19 odpowiesz „tak”).
- **DS06** — Polskie teksty komponentów istnieją tylko w storybookach (`Polish…`); nie ma jednego słownika do aplikacji (dotyczy, jeśli w L04 wybierzesz polski albo język z przeglądarki).
- **DS07** — Nie ma komponentu ani wzorca dla stanu offline PWA (dotyczy, jeśli w L17 odpowiesz „tak”).
- **DS08** (2026-10-28, z budowy prototypu) — Błąd opisu z walidacji w przeglądarce przy zwiniętym „Description” otwiera przełącznik, ale fokus zostaje w tytule zamiast w opisie (s04.33, Chromium). Szczegóły: `prototypes/task-list-v1/POSTEP.md`, „Rozszerzenie 2026-10-28”.

## 6. Liczby

- Ekrany: **8** (s01–s08; w tym 4 widoki wewnątrz s04: s05–s08).
- Stany: **77** z identyfikatorem (s01: 12, s02: 12, s03: 3, s04: 21, s05: 7, s06: 8, s07: 7, s08: 7); 2 z nich (s04.13, s07.7) są poza prototypem (L01), więc prototyp pokazuje **75**.
- Scenariusze do przełączania: **12** identyfikatorów (P01–P12), z czego P10 wycofany, więc czynnych **11**.
- Konta demo: **4** (K1–K4).
- Luki w specyfikacji: **22** (L01–L22): 3 kryteria bez ekranu lub stanu, 8 stanów bez kryterium, 7 sprzeczności, 4 niepodjęte decyzje. Po odpowiedziach z 2026-10-26: wszystkie 22 rozstrzygnięte (sekcja 7).
- Luki w design systemie: **7** (DS01–DS07). Po odpowiedziach: 2 do zrobienia w DS (DS03 szkielet `AuthCard`, DS04 historia „strona nie wstała” w Storybooku), 1 bez nowego komponentu (DS02), 4 bez zmian teraz (DS01, DS06, DS07, DS05 przeniesione do wersji 2).

## 7. Odpowiedzi właściciela (2026-10-26) i co zostało

### Rozstrzygnięte

| Luka | Odpowiedź | Co zmienia w mapie |
|---|---|---|
| L01 | Prototyp zostaje przy własnej liście; cudzych list nie wdrażamy na tym etapie. | s04.13 i s07.7 poza prototypem (zostają testami API); P10 wycofany. |
| L03 | Obie reguły potwierdzone: min ≤ max oraz obie kwoty albo żadna. | Bez zmian w mapie; do wpisania w #15. |
| L07 | Wersja z design systemu zatwierdzona: opis tylko w otwartym wierszu, akcje w „…”; TS do poprawienia. | s05 bez zmian (już według DS). |
| L09 | Edycja i usuwanie należą do E01. | Bez zmian w mapie (s06, s08 zostają); do poprawienia w #15. |
| L10 | Właściciel zostawił decyzję agentowi. **Decyzja:** s01 pokazuje spokojną informację „Your session has expired. Sign in again.” nad formularzem, gdy do wylogowania doszło przez wygaśnięcie sesji; zwykłe wejście i zwykłe wylogowanie nic nie pokazują. To nie jest powrót na poprzednią stronę (SI-Q7 dalej obowiązuje: zawsze `/`). | Nowy stan s01.11. |
| L11 | Komunikat w rodzaju „rejestracja została wyłączona”. | s02.7: „Sign-up has been turned off. Ask the owner of this Taskly.” |
| L12 | Szkielet. | Nowe stany s01.12, s02.12, s03.3; przełącznik P12; DS03. |
| L13 | Właściciel zostawił propozycję agentowi. **Propozycja:** powłoka aplikacji z działającym „Sign out” i `ErrorState` „Could not open your tasks.” z „Try again”, bez listy i bez szybkiego dodawania. | Nowy stan s04.21. |
| L14 | Teksty z design systemu. | s04.8, s04.11, s04.12, s07.6 korzystają z tekstów DS. |
| L15 | Komunikat o usunięciu zadania i odświeżenie listy. | s06.8, s07.6. |
| L16 | Bez odzyskiwania hasła teraz, dodamy później. | s01 bez wskazówki. |
| L17 | Bez wersji offline i synchronizacji teraz. | s04 bez stanu offline; DS07 odpada. |
| L18 | Zapis kwot z design systemu („1 200–1 500 zł”). | Bez zmian w mapie; do poprawienia w #15-AC1 i AC2. |
| L21 | Nazwa listy jest nagłówkiem; w v1 bez zmiany nazwy, edycja później. | s04: `h1` bez edycji. |
| DS01, L05 | Na razie bez imienia w nagłówku. | `AppHeader` bez zmian. |
| DS06 | Teraz tylko angielski. | Bez słownika PL. |

### Druga tura (rozstrzygnięte)

| Luka | Odpowiedź | Co zmienia w mapie |
|---|---|---|
| L04 | Docelowo produkt po polsku, z przełącznikiem języka w przyszłości; prototyp po angielsku, bez tłumaczeń. SI-Q3 („English UI”) trzeba będzie zmienić. | P11: tylko EN. |
| L19 | Role edytora i obserwatora tylko w dokumentacji (wersja 2); prototyp pokazuje gościa i właściciela. | Bez ekranów ról; DS05 przechodzi do wersji 2. |
| L20 | Zakresy z podanych kwot, losowo ±50–250 zł; podzadania ściany: szafka RTV 500–1 000 zł, uchwyt TV 200–400 zł. | Sekcja 3, dane K2. Gniazdka zostają w opisie ściany. |
| L08 | Wersja z design systemu: edycja i usunięcie czekają na serwer w formularzu lub oknie; od razu widać tylko dodanie. TS do poprawienia. | s06.3, s06.4, s08.4. |
| L02 | Tekst #16-AC3 bez zmian; prototyp E01 bez przyszłych wydatków; część o podsumowaniu sprawdzamy przy E03-S02. | Bez zmian. |
| L06 | Zapis motywu na koncie nie wchodzi do wersji 1. **Przyjęte przez agenta:** przełącznik motywu zostaje (DS), a jak zapamiętać wybór w v1 (w przeglądarce czy wcale), rozstrzygnie specyfikacja; prototyp trzyma wybór tylko do odświeżenia strony. | s04.20. |
| L22 | Nowy tekst pustego stanu: „No tasks yet. Start with one task. Only the title is required.” | s04.3. |
| DS02 | Zgoda: zwykłe przygaszone zdanie z `role="status"` w `AuthCard`, bez nowego wariantu `Alert`. | s01.11. |
| DS03 | Zgoda: szkielet karty jako stan `AuthCard`. | s01.12, s02.12, s03.3. |
| DS04 | Zgoda: `AppShell` + `ErrorState`, plus jedna historia w Storybooku. | s04.21. |
| DS05 | Przeniesione do wersji 2 (L19). | — |

### Trzecia tura: pytania z budowy prototypu (2026-10-27, rozstrzygnięte)

Pytania z raportu końcowego `prototypes/task-list-v1/POSTEP.md`. Wpisane do specyfikacji, design systemu i #15.

| Pytanie | Odpowiedź | Gdzie wpisane |
|---|---|---|
| Tekst 404 przy edycji i podzadaniu | Tekst z mapy „This task was deleted. The list has been refreshed.” | TS-UI, TS-Edge; DS `DetailsInRow` |
| Teksty limitów rejestracji | „Use at most 100 characters.” (imię), „Use at most 128 characters.” (hasło) | SI-UI „Field errors”; DS `fake-api`, `SignUpForm` |
| s04.21 z nagłówkiem „My renovation” | Ostatecznie tak. | TS-UI „Page did not open”; s04.21 |
| 409 przy dodawaniu | Pokazać tekst serwera („Please try again”). | TS-UI, TS-Edge; s04.12 |
| Ile czekać przy limicie prób | Tak: „Too many attempts. Try again in N seconds.” z nagłówka `X-Retry-After`, bez niego ogólny tekst. | SI-Messages, SI-API, SI-Edge, SI krok 3; DS `fake-api`, `SignInForm` |
| s04.22–s04.29 | Przenieść do E02/E03. | `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md` |
| SI-Q3 i poprawki #15 | Wpisać. | SI-Q3 (L04); #15 (L03, L09, L18); TS-UI (L07, L08, L22) |

### Czwarta tura: rozszerzenie z 2026-10-28 (rozstrzygnięte)

- **L23** — Dane demo K2 po R12. Kwoty od właściciela (L20) zakładały, że uchwyt TV i szafka RTV są poza szacunkiem ściany: ich opisy mówią „Not included in the wall estimate”, a opis ściany „Without the TV cabinet, the TV mount and the sockets”. Po R12 szacunek ściany to suma podzadań (700–1 400 zł), więc te zdania przeczą temu, co widać.
  **Pytanie:** (A, rekomendacja) kwoty bez zmian, z opisów uchwytu i szafki usuwam „Not included in the wall estimate”, a opis ściany skracam do „Living room. Without the sockets”; wpisane 350–660 zł zostaje ukryte i wraca po usunięciu podzadań. (B) Dane bez zmian, sprzeczność zostaje jako materiał do testu. (C) Podasz kwoty gruntowania, tynku dekoracyjnego i impregnacji, żeby suma ściany objęła całą pracę.
  **Odpowiedź (2026-10-28):** A. Rozszerzenie mapy zatwierdzone („zatwierdzam”).
