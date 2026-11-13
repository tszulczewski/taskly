# Miejsca podczas tworzenia zadania — analiza luki

Data: 2026-11-13. Zakres: przegląd dokumentacji, zgłoszeń i kodu; bez implementacji i bez zmiany zatwierdzonych wymagań.

## Wniosek

Brakuje jawnego wymagania wyboru miejsc przed zapisaniem zadania. D09, D21 i D26 w `product-brief.md` określają wiele miejsc, podzadania i edytowalny katalog, ale nie moment przypisania. Spec E02 `2026-11-03-order-markers-and-spaces.md`, sekcje API Contracts, UI/UX → Places i Implementation Plan → Phase 2, projektuje przypisanie dopiero do istniejącego `taskId` przez PUT/DELETE. Kryteria AC1–AC10 zgłoszenia E02-S03 #19 także nie wymagają przypisywania przy tworzeniu.

Sprawdzono na żywo: https://github.com/tszulczewski/taskly/issues/19 oraz https://github.com/tszulczewski/taskly/issues/14. Notatki zgłoszeń o stanie implementacji mogą być starsze od kodu.

E04 #14 to „Later (parked)”: jego Expected outcome mówi wprost, że nic nie jest implementowane z tego zgłoszenia. Samo dopisanie pomysłu do E04 nie zleci wdrożenia. Zalecenie: osobna historia kontynuująca E02-S03, z zależnością od jego obsługi miejsc. Jeżeli ma to wejść do E04, trzeba jawnie zaplanować historię i zmienić status/zakres zaparkowanego epika.

## Dowody z kodu

- `packages/ui/src/product/tasks/quick-add.tsx`: pola tytułu, kwot i opisu; brak wyboru miejsc.
- `packages/ui/src/product/tasks/types.ts`: `TaskFormValues` nie zawiera identyfikatorów miejsc.
- `packages/ui/src/product/tasks/task-row.tsx`: `PlacePicker` wywołuje `onToggle(task.id, ...)` i `onCreate(task.id, ...)`; obsługuje już istniejący wiersz.
- `packages/core/src/schemas.ts`: `createTaskInput` przyjmuje tylko title, description, estimate, parentId.
- `packages/core/src/tasks.ts`: `createTask` zapisuje zadanie bez przypisań miejsc. W tej gałęzi backend miejsc z E02 jeszcze nie występuje; istnieją komponenty UI i spec implementacji. Nie należy zatem opisywać zmiany jako samego podłączenia gotowego backendu.

## Proponowany zapis historii i kryteria odbioru

Tytuł: „Właściciel wybiera miejsca podczas dodawania zadania lub podzadania”. Poniższe jest propozycją do przyjęcia, nie zmianą obowiązujących specyfikacji.

1. Przed kliknięciem Add można otworzyć Places i zaznaczyć wiele istniejących miejsc; wybrane nazwy są widoczne w formularzu. Miejsca pozostają opcjonalne.
2. Zapis tworzy zadanie razem ze wszystkimi wybranymi przypisaniami. Po odpowiedzi i po odświeżeniu zadanie pokazuje te miejsca.
3. Ten sam przepływ działa dla podzadania; wybór nie jest dziedziczony z rodzica i nie zmienia miejsc rodzica ani rodzeństwa.
4. Z formularza można utworzyć brakujące miejsce; po sukcesie trafia ono do katalogu i zostaje zaznaczone lokalnie. Obowiązują istniejące reguły nazw, kolorów i limit 20.
5. Błąd zapisu zadania zachowuje pola i wybór do ponowienia; sukces czyści wybór oraz pola i przywraca fokus na tytuł. Następne zadanie nie przejmuje poprzednich miejsc.
6. Loading/error/retry katalogu są jawne; nieudane pobranie nie udaje pustego katalogu. Dodawanie zadania bez miejsc pozostaje dostępne.
7. Usunięcie wybranego miejsca przed zapisem nie daje częściowo zapisanego zadania. Formularz pokazuje błąd, odświeża katalog i pozwala skorygować wybór. Odmowa uprawnień również nie zapisuje zadania ani przypisań.
8. Utworzone w katalogu miejsce pozostaje w nim po anulowaniu formularza lub błędzie zadania; samo zaznaczenie przed Add nie tworzy przypisania do zadania. To proponowana semantyka wymagająca zapisania w spec.

## Co i gdzie dopisać

| Dokument | Uzupełnienie |
| --- | --- |
| `product-brief.md`, D09/D21/D26 i Key flows | Jawny moment wyboru: już podczas dodawania zadania/podzadania, z opcją nowego miejsca. Zapisać decyzję właściciela o tym przepływie. |
| Nowa spec rozszerzenia E02 (zalecane) lub rewizja `2026-11-03-order-markers-and-spaces.md` | Dodać powyższe AC oraz API, UI/UX, błędy, kolejkę, cache i kroki wdrożenia. Przy rewizji zmienić również Phase 2 kroki 9–13; sam dopisek na górze nie wystarczy. |
| `backlog.md` i nowa historia w trackerze | Zarezerwować kolejny wolny identyfikator historii E02 po sprawdzeniu trackera; zależność od E02-S03 #19; link do spec i testowalne AC. Nie otwierać ponownie ukończonej historii wyłącznie dla nowego zakresu. |
| Dokumentacja Storybook QuickAdd / PlacePicker / E02 | Opisać wybór przed zapisem, stany i fokus; dodać przykłady zadania i podzadania. |

## Zakres techniczny do rozpisania w spec

- UI: rozszerzyć QuickAdd i kontrakt wartości o wybór miejsc, przekazać go także do QuickAdd podzadania przez TaskList/TaskRow. Wykorzystać istniejący PlacePicker, bez logiki uprawnień w UI.
- App: `packages/app/components/tasks/task-list-screen.tsx`, `task-items.ts`, `use-tasks.ts` oraz obsługa katalogu z E02. Przekazać identyfikatory do POST, uwzględnić miejsca na tymczasowych wierszach; zachować kolejkę `tasks:<listId>` i ochronę tymczasowych wierszy przy zmianach katalogu. Nazwy/kolory brać z aktualnego katalogu, nie utrwalać ich w szkicu jako niezależnej kopii.
- API/core: rozszerzyć `createTaskInput` o opcjonalne `placeIds` (domyślnie `[]`, UUID, limit i jawna reguła duplikatów), używane przez `POST /api/lists/[listId]/tasks`. `createTask` autoryzuje listę i każde miejsce według E02 Q3, zapisuje zadanie i relacje w jednej transakcji, zwraca kompletny TaskView. Ustalić deterministyczne blokowanie wielu miejsc i wyścig z usuwaniem. Stare żądania bez placeIds działają dalej.
- Nie realizować zapisu jako POST zadania i serii niezależnych PUT przypisań: awaria dawałaby zadanie zapisane tylko częściowo, a ponowienie formularza mogłoby je zdublować.
- Schemat DB: po wdrożeniu E02 wystarczą istniejące `places`/`task_places`; samo rozszerzenie nie wymaga nowej tabeli. W obecnej gałęzi trzeba najpierw dostarczyć tę część E02.
- Testy: jednostkowe 100% zmienionej logiki; integracyjne dla atomowości, ról, obcych/usuniętych miejsc, wyścigu delete/create oraz podzadań; browser dla wyboru istniejącego i nowego miejsca, błędu/ponowienia, resetu, braku dziedziczenia i odświeżenia strony. Zweryfikować brak podwójnego zadania i podwójnego naliczenia kosztu po odrzuconym zapisie i ponowieniu.

## Granice weryfikacji

Przeczytano spec E02, backlog, powiązane fragmenty E01 i briefu oraz wskazany kod. Odczytano zgłoszenia #14 i #19 przez gh. Nie uruchamiano aplikacji ani testów: to analiza wymagań, bez zmiany kodu. Nie zmieniano zgłoszeń, zatwierdzonych specyfikacji ani planu wydania.

## Aktualizacja po autoryzacji (2026-11-13)

Ponowny odczyt trackera wykazał, że PR #70 (bazowe miejsca) scalono 2026-11-12; lokalna gałąź analizowana wyżej jest starsza. Otwarty pozostaje PR #72 (reorder). Zgodnie z poleceniem kontynuowania uzupełniono spec E02, brief i backlog oraz zgłoszenia #19 i #12 o AC11–AC18 jako osobny follow-up E02. Poprzednia rekomendacja nowej historii jest zastąpiona rozszerzeniem nadal otwartego #19. Nie zmieniano kodu ani PR-a #72. Wymagania są teraz zapisane w trackerze; pliki spec/brief/backlog pozostają lokalne, bez commita/pusha.
