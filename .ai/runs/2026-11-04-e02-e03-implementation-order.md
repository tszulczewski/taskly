# Kolejność implementacji E02 i E03 po review

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md; .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Outcome:** success

## Goal

Ocenić, czy po ostatnich review nadal należy implementować E03 przed E02. Zakres: analiza zależności, zmian projektowych i stanu kodu; bez implementacji i zmian wymagań.

## Steps taken

1. Odczytano lessons, backlog, brief, decyzję o kolejności z 2026-11-03, obie specyfikacje oraz logi review E02/E03.
2. Sprawdzono aktualne issues #13, #17 i #20, status PR-ów #52–#55 oraz komentarz review #54 przez GitHub CLI. Wszystkie te PR-y są scalone; #17 nadal jawnie zależy od #20.
3. Sprawdzono schematy widoków, serwisy zadań, mapowanie UI i hooki TanStack Query. Ukończenie, znaczniki i miejsca nie są zaimplementowane; moveTask pozostaje stubem. Kolejka per lista i ogólny replay są nadal pracą do wykonania.
4. Rozdzielono twardą zależność (E03 faza 1 przed E02 fazą 3) od rekomendacji produktowej (całe E03 przed E02). Sprawdzono wpływ F4/S1 i P1–P10.
5. Zapisano raport: rekomendacja E03 (#20, #21, #47), potem E02 (#18, #19, #17). Odnotowano draft, auto i nieaktualne wzmianki o nieistniejących jeszcze specyfikacjach w issues, bez zmieniania tych dokumentów.

## Files changed

- Ten log i .ai/analysis/2026-11-04-e02-e03-implementation-order.md.

## Verification (commands run and results)

- Odczyt repozytorium oraz GitHub CLI: wyniki opisane wyżej; brak mutacji trackera.
- Bieżący checkout: 0092656, gałąź docs/e02-spec-review-fixes. GitHub main: a7d465f (squash #55); lokalny origin/main jest starszy. Porównanie historii wskazuje squash zamiast tożsamości commitów; sprawdzono dodatkowo identyfikatory drzew.
- Identyfikatory drzew są równe: 2bfb7eb0998800c5cc60cddd0ce42c6272ab2504. Analizowany kod odpowiada aktualnemu main na GitHub.
- Testy aplikacji pominięte: analiza nie zmienia kodu i nie potwierdza działania przyszłych funkcji. Historyczne zielone testy z review dotyczą istniejącego kodu.
- Prettier dla raportu i logu oraz git diff --check: zaliczone. Bez commitów.

## Problems / open questions

- E03 nadal ma status draft, mimo pozytywnego review i scalenia dokumentu. Nie należy automatycznie utożsamiać scalenia specyfikacji z akceptacją jej statusu do implementacji.
- E03 Phasing nadal wskazuje auto zamiast main. Konfiguracja i SDLC wskazują main.

## Lessons recorded (links into .ai/lessons.md)

- Bez nowej lekcji technicznej; ustalenia dotyczą kolejności prac i porządkowania metadanych specyfikacji.
