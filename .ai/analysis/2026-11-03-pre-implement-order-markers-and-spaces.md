# Weryfikacja specyfikacji E02

- **Date:** 2026-11-03
- **Readiness:** no-go
- **Spec:** `.ai/specs/2026-11-03-order-markers-and-spaces.md`
- **Revision:** lokalny plik nieśledzony przez Git; kod bazowy `e092734`.
- **Podstawa:** `BACKWARD_COMPATIBILITY.md`, `.ai/specs/_template.md`, `CODE_REVIEW.md`, instrukcje pakietów, engineering standards, brief, decyzje E02/E03 i dokumentacja Storybook.

Specyfikacja wymaga korekty przed implementacją: pozostaje w stanie `draft`, nie definiuje początkowego ładowania/błędu miejsc oraz zawiera sprzeczny scenariusz M-1. Dodatkowo trzeba domknąć inicjalizację miejsc i obsługę odpowiedzi mutacji z różnych kolejek. Wymagania specyfikacji ani kod aplikacji nie zostały zmienione.

## Ustalenia

### F1 — Critical: deklarowany status nie dopuszcza implementacji

**Dowód:** spec:4 ma `Status: draft`; szablon repozytorium rozróżnia `draft` i `ready`. Bramka R1 umiejętności `om-pre-implement-spec` wymaga statusu dopuszczającego implementację.

**Poprawka:** po rozstrzygnięciu ustaleń i akceptacji właściciela zmienić status na `ready`. Samo zamknięcie Open Questions nie oznacza zatwierdzenia całej specyfikacji.

### F2 — Critical (R4): brak kontraktu pierwszego ładowania i błędu miejsc

**Dowód:** spec:234–238 opisuje `usePlaces()` i gotowy `PlacePicker`, ale nie zachowanie przed odpowiedzią `GET /api/places` ani po jej błędzie. `packages/ui/src/product/places/place-picker.tsx:34` wymaga gotowej tablicy `places`; komponent nie ma stanu ładowania ani błędu pobierania. Jego pusta tablica oznacza rzeczywiste „No places yet.” i udostępnia tworzenie. Dokumentacja `PlacePicker.mdx`, §6, również nie definiuje błędu pobrania.

**Skutek:** implementator musi zdecydować, czy ukryć akcję, blokować listę, czy pokazać stan w popoverze. Podstawienie `[]` podczas błędu przedstawi istniejące miejsca jako nieistniejące i uruchomi formularz bez prawidłowej walidacji duplikatów/limitu w kliencie; serwer nadal chroni dane.

**Poprawka:** dopisać zachowanie ładowania, błędu z ponowieniem i rzeczywistej pustej listy, z konkretnym tekstem i wykorzystaniem wspólnych komponentów. Zadania powinny pozostać dostępne, jeśli pobranie miejsc zawiedzie. Dodać test opóźnionego GET i błędu → ponowienie → poprawne opcje; błędu nie przedstawiać jako pustej kolekcji. Źródło reguły: standards §5 oraz bramka UI R4.

### F3 — Important: inicjalizacja miejsc koliduje z publicznym dla zalogowanego użytkownika API

**Dowód:** spec:140–142 dodaje stałe klucze `a0`…`a7` wyłącznie w gałęzi tworzenia domyślnej listy. Spec:185–194 dopuszcza `POST /api/places` dla każdego zalogowanego użytkownika; tylko `createPlace` bierze blokadę per użytkownik. `packages/core/src/lists.ts:98` tworzy domyślną listę dopiero przy `ensureDefaultList`.

**Scenariusz:** nowy użytkownik wywołuje POST przed pierwszym otwarciem `/`. Pierwsze własne miejsce dostaje `a0`. Następne wejście do aplikacji tworzy listę i próbuje wstawić osiem domyślnych miejsc, również od `a0`: konflikt indeksu pozycji wycofuje transakcję. Samo zmienienie seedowania na append nie wystarczy — 13 własnych miejsc plus osiem domyślnych przekroczy limit. Równoległy POST i pierwsze wejście mają ten sam problem.

**Poprawka:** ustanowić jeden protokół inicjalizacji przed dostępem do kolekcji miejsc (np. zapewnić domyślną listę i jej seed przed CRUD miejsc), określić kolejność blokad i użyć wspólnej blokady dla każdej ścieżki tworzącej miejsca. Zachować trwały warunek jednorazowej inicjalizacji, żeby usunięcie wszystkich miejsc nie uruchamiało seeda. Dopisać testy POST przed pierwszą wizytą oraz POST równolegle z pierwszą wizytą. Podczas wdrożenia określić też, czy stary proces jest zatrzymany między backfillem a uruchomieniem nowego kodu: stara wersja może w tym oknie utworzyć listę bez miejsc.

### F4 — Important: różne scope pozwalają spóźnionej odpowiedzi cofnąć już zapisany marker

**Dowód:** spec:230 zastępuje drzewo otrzymanym `TaskView`; spec:231 rozdziela `row:<topLevelId>` i `order:<listId>`. Obie operacje zwracają całe drzewo. Obecny `putTask` w `packages/app/components/tasks/use-tasks.ts:45–53` zastępuje wszystkie zapisane pola, zachowując tylko tymczasowe podzadania.

**Scenariusz:** ruch zapisuje pozycję i odczytuje drzewo z `important=false`, ale jego odpowiedź jest opóźniona. Równoległy marker zapisuje `true`, odpowiedź dociera i marker opuszcza `pending`. Potem dociera wcześniejszy wynik ruchu i nadpisuje drzewo z `important=false`. Replay nie ma już markera do odtworzenia. Końcowy refetch może to naprawić, ale gwarancja „a newer change is never overwritten” nie zachodzi; do refetcha ekran pokazuje nieprawidłowy stan. Podobny problem dotyczy zapisanych miejsc i completion. Istniejące edycje/dodawanie także zwracają całe drzewo i wymagają uwzględnienia w protokole.

**Poprawka:** opisać spójny sposób przyjmowania wyników obejmujący wszystkie mutacje zwracające to samo drzewo: np. wspólną kolejkę obejmującą ich zakres kolizji, albo wersjonowanie/odrzucanie starszych snapshotów. Nie wystarcza kolejka samych ruchów. Dopisać testy z rzeczywistym QueryClient: odpowiedzi ruchu i markera w odwrotnej kolejności, ruch podzadania z completion rodzica oraz spóźniona odpowiedź zwykłej edycji. Test ma wykazać zachowanie już potwierdzonego wyniku również przed końcowym refetchem.

### F5 — Critical (R3): M-1 wymaga odmowy ruchu, który kontrakt uznaje za no-op

**Dowód:** spec:302: przy A,B,C ruch C między A i B po przeniesieniu B ma dostać 409. Spec:211–214 najpierw usuwa C z rodzeństwa, sprawdza sąsiedztwo A i B, a ruch do bieżącego miejsca kończy sukcesem bez zapisu.

**Kontrprzykład:** drugi klient przenosi B za C: `A,B,C → A,C,B`. Teraz żądanie C `{afterId:A,beforeId:B}` jest już spełnione. Po wyłączeniu C pozostaje `A,B`, więc sąsiedztwo jest poprawne; kontrakt wymaga no-op, a M-1 wymaga 409. Obu wymagań nie da się jednocześnie spełnić. Samo poruszenie sąsiada nie jest wykrywalnym konfliktem w tym protokole.

**Poprawka zalecana:** zapisać M-1 jako utratę sąsiedztwa, np. początkowo `A,B,C,D`, żądanie przeniesienia C między A i B, a drugi klient przenosi B za D: `A,C,D,B`. Po wyłączeniu C między A i B pozostaje D, więc wynik to jednoznaczne 409. Osobny test powinien potwierdzić sukces/no-op dla `A,C,B`. Jeśli każdy ruch sąsiada ma unieważniać żądanie, potrzebna jest decyzja o wersjonowanym kontrakcie, którego obecne API nie ma.

## Bramka gotowości

| Bramka                                   | Wynik | Uzasadnienie                                                                                                                                                                              |
| ---------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 — status                              | ❌    | F1: draft.                                                                                                                                                                                |
| R2 — pytania i założenia                 | ✅    | Open Questions zamknięte; Q1–Q4 zapisane jako odpowiedzi właściciela.                                                                                                                     |
| R3 — wymaganie → kryterium → faza → test | ❌    | F5: M-1 i algorytm mają sprzeczne wyniki. Pozostałe kroki wskazują testy; treści AC w trackerze nie weryfikowano.                                                                         |
| R4 — kontrakty API/UI                    | ❌    | F2: brakuje stanu pobierania i błędu nowego źródła danych.                                                                                                                                |
| R5 — dostarczalne fazy                   | ✅    | Trzy PR-y, zależność fazy 3 od E03, bramka i ręczne sprawdzenie na końcu każdej fazy.                                                                                                     |
| R6 — zgodność opisu istniejącego kodu    | ✅    | Stub moveTask, pola pozycji/statusu, brak miejsc/markerów, taskFields/createTaskInput i wymienione API UI potwierdzone w źródłach. useTaskViews jest jawnie elementem planowanym E03/E02. |

## Kompatybilność i kompletność

Przejrzano każdą fazę względem wszystkich 10 powierzchni `BACKWARD_COMPATIBILITY.md`. Nie wykazano krytycznego złamania kompatybilności. Ryzyka migracji i kompatybilność są opisane w Data Model i Risks & Impact Review; osobny nagłówek nie jest konieczny.

- **DB:** faza 1 dodaje kolumny z domyślnymi wartościami, faza 2 nowe tabele i backfill; faza 3 bez migracji. Testy upgrade, rollback oraz `risk-high` zaplanowane. F3 wymaga domknięcia protokołu inicjalizacji/wdrożenia.
- **HTTP:** faza 1 rozszerza PATCH/widoki, faza 2 dodaje trasy/widoki, faza 3 nową trasę. Dotychczasowe kształty wejścia i envelope pozostają obsługiwane; stary Zod usuwa nieznane pola odpowiedzi.
- **Ordering:** nowe miejsca i ruchy korzystają z obecnych kluczy i `COLLATE "C"`; brak renumerowania. F5 dotyczy semantyki odmowy, nie zmiany zapisanego formatu.
- **Workspace APIs:** wszystkie fazy dodają eksporty/pola; zmiana wyniku stuba moveTask wymaga aktualizacji jego testu i konsumentów w tej samej fazie, co plan przewiduje.
- **Auth:** role, sesje, cookies i zaproszenia bez zmiany we wszystkich fazach. Własność miejsc jest nowym zakresem autoryzacji; negatywne testy zaplanowane.
- **SSE, pieniądze, env, PWA/service worker, deployment contract:** bez zmiany we wszystkich trzech fazach. F3 wymaga instrukcji kolejności migracji i startu aplikacji, bez zmiany entrypointu czy bind address.

Cel, wymagania i zakres są zawarte w TLDR/Proposed Solution/Out of this epic/Decisions/Acceptance criteria; różne nazwy nagłówków względem krótkiego szablonu repo nie są luką. Podział na trzy samodzielne wdrożenia jest już zatwierdzony w Q1 i nie wymaga kolejnego pytania o podział specyfikacji. Nie znaleziono sprzeczności z aktywnymi D07, D09, D21, D25, D26 ani zakresu sharing w wersji 1; testowanie obecnej autoryzacji nie jest implementacją współdzielenia.

## Ryzyka i plan korekty

| Ryzyko                              | Poziom | Działanie                                                                                                  |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Pierwsze użycie API i seed miejsc   | High   | F3: wspólna inicjalizacja/blokady, testy kolejności i współbieżności.                                      |
| Snapshoty z różnych mutacji         | High   | F4: protokół przyjmowania odpowiedzi i testy odwrotnej kolejności odpowiedzi.                              |
| E02 i E03 współdzielą replay        | Medium | Zachować jedną implementację, rozszerzyć zestaw testów po połączeniu obu faz. Spec już wskazuje to ryzyko. |
| Migracje i rollback tracą nowe dane | Medium | Zachować opisany koszt rollbacku, test upgrade i plan w PR; nie wykonywano migracji podczas audytu.        |

1. **Przed implementacją:** poprawić F2/F5, uzgodnić rozwiązania F3/F4 i dopiero zatwierdzić `ready` (F1). Następny krok: korekta przez `om-spec-writing`.
2. **W planie implementacji:** dopisać wskazane regresje i procedurę wdrożenia; zachować pełną bramkę każdej fazy oraz manualny test.
3. **Przed fazą 3:** potwierdzić merge E03 Phase 1 i dopasować testy do faktycznej wspólnej implementacji replay.

## Zakres i ograniczenia audytu

Audyt statyczny pełnej specyfikacji, wskazanych kontraktów core/app/ui, schematu i obecnych migracji, E03, briefu, decyzji, lessons, lokalnego backlogu i dokumentacji komponentów. Użyto osobnego agenta wyłącznie do wyszukiwania źródeł modelu/migracji, zgodnie z instrukcją umiejętności; nie uruchamiano agenta recenzującego. Kontrprzykłady F4/F5 sprawdzono jednorazowym skryptem Node z asercjami; to modele opisanych reguł, nie wykonanie przyszłej implementacji.

Nie uruchamiano builda, testów aplikacji, PostgreSQL ani przeglądarki, ponieważ kod funkcji jeszcze nie istnieje i nie był zmieniany. Nie pobierano issue #17–#19 ani historii PR — mapowanie ich numerowanych AC oceniono tylko na podstawie lokalnego speca/backlogu; przed zatwierdzeniem trzeba porównać pełne treści. Research rynkowy pozostaje zadeklarowaną, niezweryfikowaną wiedzą ogólną autora; nie oparto na nim ustaleń. Brak `.uxproof/` i skonfigurowanych knowledge.sources; użyto repozytoryjnej dokumentacji design systemu i rzeczywistych źródeł. Raport ma datę na początku nazwy zgodnie z nadrzędną konwencją repozytorium.
