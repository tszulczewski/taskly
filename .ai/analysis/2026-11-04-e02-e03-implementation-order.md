# Następny epik: E03 przed E02

- Data: 2026-11-04.
- Zakres: decyzja o kolejności, nie pełny audyt gotowości ani weryfikacja przyszłej implementacji.
- Stan odniesienia: GitHub main a7d465f, po scaleniu #55. Drzewo checkoutu 0092656 jest identyczne z tym main (2bfb7eb0998800c5cc60cddd0ce42c6272ab2504), mimo innej historii po squashu.

## Rekomendacja

Nadal realizować **E03, następnie E02**. Pierwszą jednostką implementacji powinno być **E03-S01 #20: ukończenie i ponowne otwieranie zadań**, wraz ze wspólną kolejką zmian i mechanizmem odtwarzania zmian oczekujących. Potem #21 i #47, następnie E02 w kolejności #18, #19, #17.

Numeracja epików identyfikuje zakresy backlogu; zależności między stories wyznaczają kolejność. Decyzja właściciela z 2026-11-03, punkt 5, już zatwierdziła E03 przed E02. Aktualne specyfikacje i issue #17 zachowują tę zależność.

## Zależności i dopuszczalne warianty

| Część | Zależność | Wniosek |
| --- | --- | --- |
| E03 faza 1, #20 | Wdrożone E01 | Można realizować bez E02; tworzy completed, position w widokach, porządek otwarte/ukończone i reguły ponownego otwierania. |
| E03 fazy 2–3, #21 i #47 | Kolejno #20 i #21 | Dostarczają sumę przyszłych wydatków i uzupełnianie brakujących wycen. |
| E02 faza 1, #18 | Wdrożone E01 | Technicznie niezależna od E03; wymaga migracji znaczników. |
| E02 faza 2, #19 | Wdrożone E01; planowana po znacznikach | Nie wymaga ukończenia; dodaje model miejsc, autoryzację, inicjalizację i UI. |
| E02 faza 3, #17 | E03 faza 1, #20 | Nie powinna ruszać przed #20: używa completed, position i kolejności otwarte/ukończone; odrzuca ruch ukończonych wierszy. |

Twardą zależnością jest **#20 przed #17**, a nie całe E03 przed każdą częścią E02. Rozpoczęcie od #18 byłoby wykonalne, lecz nie usuwa potrzeby wdrożenia #20 i oznacza zmianę dotychczas uzgodnionej kolejności. Nie znaleziono w ostatnich poprawkach przesłanki do takiej zmiany.

## Co zmieniły review

- **E02 F4 i E03 S1, PR-y #53/#54:** każda mutacja zadań listy ma używać jednej kolejki tasks:<listId>, a UI ma odtwarzać oczekujące zmiany nad danymi serwera. Pierwszy wdrażany epik tworzy wspólny mechanizm, drugi go rozszerza. Miejsce opisania kontraktu w E02 nie tworzy zależności E03 od implementacji E02. E03 krok 5 wprost bierze tę pracę na siebie, jeśli będzie pierwszy.
- **E03 R1/R2 i S2/S3:** rozdzielono moduł czystej reguły i serwisu, poprawiono obsługę szybkich przełączeń, opisano zachowanie sumy podczas zapisu i testowanie wyścigu dodania podzadania z ukończeniem. Review #54 jest pozytywne i PR jest scalony.
- **E02 P1–P10, PR #55:** doprecyzowano blokowanie przestawiania podczas dodawania zadania lub podzadania, aktualizacje cache po zmianie miejsc, usunięte miejsca w replay, walidację identyfikatorów i kontrakty. Te poprawki usuwają problemy E02, ale nie usuwają zależności #17 od #20.
- W kodzie nadal brak implementacji obu epików. use-tasks.ts ma wspólny mutationKey, ale nie ma scope ani useTaskViews; moveTask nadal rzuca NotImplementedError. Poprawki były zmianami projektu, nie dostarczeniem infrastruktury w aplikacji.

## Dlaczego nadal E03

1. Odblokowuje jedyną zależność między epikami: przestawianie zadań.
2. Dostarcza sumę przyszłych wydatków i informację o brakujących wycenach, potrzebne do sprawdzenia A01 z briefu: czy koszty wpływają na wybór kolejnych prac. Pełne sprawdzenie A01 będzie wymagało również przestawiania z E02.
3. E03 wykorzystuje istniejące status i position, bez migracji bazy. E02 potrzebuje dwóch migracji oraz nowego modelu miejsc. To ogranicza zakres pierwszego wdrożenia w bazie, choć E03 nadal wymaga starannego testowania współbieżności i pieniędzy.
4. Wspólna kolejka i replay powstaną tylko raz także przy tej kolejności. Po review nie ma już powodu, żeby wykonywać E02 tylko po to, by dostarczyć E03 tę infrastrukturę.

## Porządkowanie przed implementacją

- E03 nadal ma nagłówek **Status: draft**. Pozytywne review projektu i merge dokumentu nie powinny być traktowane jako automatyczne przestawienie statusu. Przy decyzji o wdrożeniu należy jawnie potwierdzić gotowość i uaktualnić metadane.
- E03 Phasing nadal mówi o PR-ach do **auto**. Docelową gałęzią według SDLC i aktualnej konfiguracji jest **main**.
- Issues #13, #17 i #20 zawierają stare zdania, że specyfikacja nie została jeszcze napisana. To nie zmienia zależności, ale warto podpiąć istniejące dokumenty przed uruchomieniem automatyzacji.

Nie zmieniano specyfikacji, aplikacji ani trackera. Analiza opiera się na dokumentach, źródłach i aktualnym odczycie GitHub; nie uruchamiano testów aplikacji, ponieważ nie powstała implementacja do weryfikacji.
