# Prototyp klikalny: logowanie i zadania (E01)

Klikalny prototyp zatwierdzonej mapy ekranów `prototypes/konta-i-role/mapa-ekranow.md` (ekrany s01–s08) i stanów s04.22–s04.29 (porządek i ukończenie, opisane teraz dla E02/E03 w `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md`). Ekrany są złożone z komponentów i tokenów design systemu (`packages/ui`), dane są fikcyjne, a serwer jest symulowany w pamięci strony. Prototyp nie jest częścią aplikacji ani design systemu: aplikacja go nie importuje, a wynik budowania nie trafia do gita.

Postęp prac i decyzje: `POSTEP.md`. Zrzuty z przejść: `evidence/`.

## Jak uruchomić

Z katalogu głównego repozytorium:

```bash
# 1. Zbuduj prototyp do folderu, z którego Storybook serwuje pliki (packages/ui/.storybook/public/prototypes/task-list/)
node_modules/.bin/vite build --config prototypes/task-list-v1/vite.config.ts

# 2. Uruchom Storybook (podgląd na porcie 3000, jak w lekcji)
cd packages/ui && npx storybook dev --config-dir .storybook --host 0.0.0.0 --port 3000 --no-open --ci --disable-telemetry
```

Adres: `http://localhost:3000/prototypes/task-list/index.html`. Bez Storybooka wystarczy dowolny serwer plików w `packages/ui/.storybook/public`, np. `python3 -m http.server 6107`, i ten sam adres na jego porcie.

Po zmianie kodu prototypu zbuduj go jeszcze raz (krok 1) i odśwież stronę.

Testy nawigacji (Vitest, jsdom, prawdziwy silnik przeglądu):

```bash
npx vitest run --config prototypes/task-list-v1/vitest.config.mts
```

Mają własny config i nie wchodzą do `npm test` aplikacji (progi pokrycia 100% dotyczą tylko `packages/`).

## Jak go używać

- **Pasek przeglądu** na górze nie jest częścią produktu. Są w nim: lista ekranów s01–s08, „Reload screen”, „Reset prototype”, motyw, zegar demo i zwijany blok „Account, states and scenarios”.
- **„Go to state”** (w bloku): każdy stan z mapy. Wybór ustawia przełączniki na domyślne plus to, czego stan potrzebuje, loguje konto, przywraca dane z mapy i otwiera ekran. W pasku pojawia się zdanie, co kliknąć.
- **Silnik przeglądu** (`silnik/`): „Clickable / Comment”, „Presentation”, „Threads”, „← Back”. Komentarze zapisują się w przeglądarce; eksport przez „Export for repository” (nowy `silnik/comments.js`) albo „Export Markdown”.
- **Notatka pod każdym ekranem**: numery historii i kryteriów, co jest symulacją i czego prototyp nie rozstrzyga.
- **Alt+Shift+R** otwiera bieżący ekran od nowa, także z otwartego okna (okno usuwania zasłania pasek przeglądu).
- **Przejście między s04 a s05–s08** to zmiana widoku na tej samej stronie, więc niczego nie ładuje. Ładowanie (P05, P12) działa przy wejściu z innej strony, po „Reload screen” i po zmianie konta.

## Konta demo

Wszystkie fikcyjne, domena `taskly.test` nie istnieje. Nie wpisuj prawdziwych haseł.

| ID | Kto | Email / hasło | Lista |
|---|---|---|---|
| K1 | gość niezalogowany | — | — |
| K2 | Marta Zielińska | `marta@taskly.test` / `remont-demo-2026` | „My renovation”: 4 zadania z mapy (sekcja 3) |
| K3 | Jan Kowal | `jan@taskly.test` / `pierwszy-dom-01` | pusta; konto powstaje przy rejestracji (s02.11) albo po wybraniu go w pasku |
| K4 | Ewa Lis | `ewa@taskly.test` / `druga-lista-02` | jedno zadanie „Paint the hallway” |

Konto można zmienić w pasku bez formularza (to skrót przeglądu, nie funkcja produktu).

Zegar demo ma stałe „teraz”: poniedziałek 2026-10-26, 10:00 CET. Wersja 1 nie pokazuje dat, więc zegar jest tylko informacją.

## Scenariusze (przełączniki P01–P12)

| ID | Przełącznik | Wartości |
|---|---|---|
| P01 | Rejestracja otwarta | nie (domyślnie) / tak |
| P02 | Wynik logowania | sprawdza konta demo / złe dane / 429 / brak sieci |
| P03 | Wynik rejestracji | tworzy konto (zajęty email odrzuca) / email zajęty / dane odrzucone / rejestrację wyłączono w trakcie / 429 / brak sieci |
| P04 | Sesja | ważna / wygasa przy następnym żądaniu (401); przy K1 „none” |
| P05 | Ładowanie listy | szybkie / wolne (2 s) / błąd / błąd raz, potem sukces / zła odpowiedź serwera |
| P06 | Odpowiedź na zmiany (dodaj, edytuj, usuń, przesuń, ukończ) | potwierdza / odmawia / nie odpowiada; opóźnienie 0 / 0,6 / 1,5 / 3 s (logowanie i rejestracja też czekają tyle) |
| P07 | Wylogowanie | udane / nieudane / nieudane raz, potem udane |
| P08 | Podmiana listy zalogowanego konta | lista K2 / pusta / 30 zadań z długimi tekstami |
| P09 | Wyścigi (jednorazowo) | brak / zadanie usunięte w innej karcie (404 przy edycji lub podzadaniu) / konflikt pozycji (409 przy dodaniu lub przesunięciu) |
| P10 | — | wycofany (L01) |
| P11 | Widok | „Open at 320 / 768 / 1440 px” (nowe okno); odczyt ograniczonego ruchu; tylko angielski |
| P12 | Ładowanie strony | szybkie / wolne (szkielet, 2 s) / strona nie wstała (tylko lista) |

Przełączniki jednorazowe (P09, „raz” w P05 i P07, „wygasa” w P04) same wracają na wartość domyślną po użyciu; widać to w pasku.

## Ograniczenia symulacji

- **Nic nie jest wysyłane ani zapisywane na serwerze.** Konta, sesja i zadania żyją w pamięci strony; odświeżenie przeglądarki zaczyna demo od nowa (komentarze zostają, bo leżą w `localStorage`).
- **Logowanie i rejestracja** są symulowane: nie ma ciasteczka, Better Auth ani limitu prób liczonego w czasie (429 włącza P02 albo P03; czas oczekiwania w komunikacie jest stały, 8 s). Rejestracja nie wysyła maila.
- **Przekierowania** serwera (gość na `/`, zalogowany na `/sign-in` i `/sign-up`, `/sign-up` przy zamkniętej rejestracji) są pokazane jako karta „Prototype · access gate” z przyciskami, nie jako prawdziwe przekierowanie.
- **Kolejność** zmienia się tylko w tej stronie; nie ma kolumny `position` ani indeksowania ułamkowego. Ukończone zadania są pokazywane na końcu tak jak w design systemie.
- **Odpowiedzi serwera** pochodzą wyłącznie z przełączników; nie ma prawdziwych wyścigów między kartami ani aktualizacji na żywo (SSE).
- **s05–s08** otwierają się same: prototyp klika tytuł, „Add subtask” albo „…” i pozycję menu tak jak osoba.
- **P11**: szerokości otwierają nowe okno, w którym demo zaczyna się od nowa; ograniczonego ruchu nie da się przełączyć ze strony (ustawienie systemu albo DevTools).
- **Okno usuwania** jest modalne i zasłania pasek przeglądu; przy „nie odpowiada” nie da się go zamknąć inaczej niż Alt+Shift+R.
- **Komentarzy nie da się przypiąć** do menu i okien (renderują się poza ramką ekranu).
- **Poza prototypem** zostają s04.13 i s07.7 (cudza lista lub zadanie, L01): to testy API. Nie ma ról edytora i obserwatora (L19), przyszłych wydatków (L02), trybu offline (L17) ani odzyskiwania hasła (L16).
- Teksty komunikatów pochodzą ze specyfikacji, z mapy (decyzje L10, L11, L13, L15, L22) i z przykładów design systemu (L14). Odpowiedzi właściciela z 2026-10-27 (tekst 404, limity rejestracji, s04.21, 409 z tekstem serwera, czas oczekiwania przy 429) są już wpisane do specyfikacji.

## Pliki

- `index.html`, `vite.config.ts`, `vitest.config.mts`, `tsconfig.json`
- `silnik/`: silnik przeglądu z lekcji (`prototype.js`, `prototype.css`, `README.md` bez zmian), `comments.js` (zatwierdzone komentarze), `mostek.css` (nazwy silnika na tokenach Taskly)
- `src/app.tsx` (strona przeglądu), `src/review-bar.tsx`, `src/review.css`, `src/screens.ts` (ekrany i notatki), `src/states.ts` (przewodnik po stanach), `src/scenarios.ts`, `src/store.tsx`, `src/server.ts`, `src/data.ts`, `src/presets.ts`, `src/page-open.ts`, `src/screens/*` (ekrany), `src/navigation.test.tsx`
