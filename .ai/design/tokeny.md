# Tokeny: Taskly

- Data: 2026-10-21
- Źródło: `reference.md` (ten sam katalog). Numery w kolumnie „Pochodzenie” odsyłają do jego wierszy (R01.x, R02.x, A0x), pytań (Q1–Q5), propozycji (P01–P15) i punktów sekcji Luki.
- Zatwierdził: product owner, 2026-10-21. Propozycje agenta T1–T10 zostały przyjęte w całości. T4 rozstrzygnięto zamianą: piaskową (myliła się z ochrą i oliwkową w motywie jasnym) zastąpiła turkusowa, wybrana przez product ownera 2026-10-21.
- Warstwy:
  - surowa: wartości używane tylko w tym pliku;
  - znaczeniowa: nazwy według przeznaczenia, używane w kodzie;
  - komponentu: tylko tam, gdzie komponent potrzebuje własnej wartości.
- Kolory znaczeniowe mają dwie wartości: motyw ciemny (domyślny) / motyw jasny.

## Tabela tokenów

| Token | Warstwa | Wartość | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|
| `neutral-0` | surowa | `#FFFFFF` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-50` | surowa | `#F2F4F1` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-100` | surowa | `#E8EEEA` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-150` | surowa | `#E8ECE7` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-200` | surowa | `#D6DCD5` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-400` | surowa | `#9CAAA3` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-500` | surowa | `#748079` | V3, przyjęta 2026-10-26 (przegląd prototypu) | tylko w tym pliku | w komponentach |
| `neutral-600` | surowa | `#55635C` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-800` | surowa | `#2E3834` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-850` | surowa | `#232C28` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-900` | surowa | `#17211D` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-910` | surowa | `#181F1C` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-950` | surowa | `#101513` | Luki pkt 2 (kod R02) | tylko w tym pliku | w komponentach |
| `neutral-990` | surowa | `#0B1713` | kod R02 (`--on-accent` w trybie ciemnym) | tylko w tym pliku | w komponentach |
| `green-400` | surowa | `#4CB59B` | R02.3, Luki pkt 2 | tylko w tym pliku | w komponentach |
| `green-700` | surowa | `#1E6B5A` | R02.3, Luki pkt 2 | tylko w tym pliku | w komponentach |
| `red-300` | surowa | `#F08A7B` | kod R02; propozycja T5, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `red-700` | surowa | `#B83A2B` | kod R02; propozycja T5, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-blue` | surowa | `#4F86B8` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-ochre` | surowa | `#C79A2B` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-ochre-deep` | surowa | `#A58024` | wyliczone z kontrastu; T3, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-terracotta` | surowa | `#B8674A` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-green` | surowa | `#4E9A6B` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-green-deep` | surowa | `#4B9567` | wyliczone z kontrastu; T3, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-violet` | surowa | `#8A6BB0` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-pink` | surowa | `#C2586F` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-olive` | surowa | `#8E9B3F` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-olive-deep` | surowa | `#818C39` | wyliczone z kontrastu; T3, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-plum` | surowa | `#9C5B8E` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `place-plum-bright` | surowa | `#9F5D91` | wyliczone z kontrastu; T2, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-teal` | surowa | `#2F9AA8` | T4, wybrana 2026-10-21 (zastępuje piaskową `#B0976A`) | tylko w tym pliku | w komponentach |
| `place-teal-deep` | surowa | `#2D93A0` | wyliczone z kontrastu; T4, wybrana 2026-10-21 | tylko w tym pliku | w komponentach |
| `place-slate` | surowa | `#6F8798` | Luki pkt 3 | tylko w tym pliku | w komponentach |
| `font-instrument-sans` | surowa | `"Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif` | Q4, Luki pkt 1; zapasowe kroje z kodu R02 | tylko w tym pliku | w komponentach |
| `size-13` | surowa | 13px | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `size-15` | surowa | 15px | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `size-16` | surowa | 16px | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `size-22` | surowa | 22px | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `weight-400` | surowa | 400 | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `weight-600` | surowa | 600 | Luki pkt 1 | tylko w tym pliku | w komponentach |
| `leading-145` | surowa | 1,45 | Luki pkt 1 (kod R02) | tylko w tym pliku | w komponentach |
| `leading-125` | surowa | 1,25 | propozycja T9, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `space-4` | surowa | 4px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-8` | surowa | 8px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-12` | surowa | 12px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-16` | surowa | 16px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-24` | surowa | 24px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-32` | surowa | 32px | skala odstępów | tylko w tym pliku | w komponentach |
| `space-48` | surowa | 48px | skala odstępów | tylko w tym pliku | w komponentach |
| `radius-6` | surowa | 6px | kod R02; T8, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `radius-8` | surowa | 8px | kod R02; T8, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `radius-12` | surowa | 12px | R01.1; T8, przyjęta 2026-10-21 | tylko w tym pliku | w komponentach |
| `duration-150` | surowa | 150ms | Luki pkt 8 | tylko w tym pliku | w komponentach |
| `duration-200` | surowa | 200ms | Luki pkt 8 | tylko w tym pliku | w komponentach |
| `ease-out` | surowa | CSS `ease-out` | Luki pkt 8 | tylko w tym pliku | w komponentach |
| `color-surface-page` | znaczeniowa | `neutral-950` / `neutral-50` | R01.1, Q1, Luki pkt 2 | tło strony | pod wierszami listy |
| `color-surface-list` | znaczeniowa | `neutral-910` / `neutral-0` | R02.1 | jedna ciągła powierzchnia listy; linia sumy przyszłych wydatków | karta w karcie (A02), osobne panele (R02.6) |
| `color-surface-raised` | znaczeniowa | `neutral-850` / `neutral-150` | R01.1 (ton zamiast cienia) | wiersz najechany, rozwinięty, przeciągany; paski ładowania (Luki pkt 8) | ramka panelu w panelu |
| `color-border-divider` | znaczeniowa | `neutral-800` / `neutral-200` | R01.1, R02.1 | linia między wierszami, linia pod paskiem górnym | jedyna granica pola formularza lub checkboxa (kontrast 1,4:1) |
| `color-border-control` | znaczeniowa | `neutral-500` / `neutral-500` | wynik sprawdzenia kontrastu; T1, przyjęta 2026-10-21; V3 (łagodniej, 2026-10-26) | obramowanie pól, niezaznaczonego checkboxa | linia między wierszami |
| `color-text-primary` | znaczeniowa | `neutral-100` / `neutral-900` | R01.3 | tytuł zadania, kwota otwartego zadania, tekst | ukończone zadania |
| `color-text-muted` | znaczeniowa | `neutral-400` / `neutral-600` | R01.3, R01.4, R02.2, Luki pkt 4 | druga linia wiersza, „Ważne”, „Pilne”, „1/3”, tekst zachęty w pustym polu, ukończone zadania, teksty pomocnicze | kwota otwartego zadania, przycisk główny |
| `color-action-primary` | znaczeniowa | `green-400` / `green-700` | R02.3 | przycisk główny, zaznaczony checkbox, aktywna pozycja nawigacji, tekst działań („Dodaj szacunek”, „3 zadania bez szacunku”) | tło dużej powierzchni (A01.1), dekoracja, kropki miejsc |
| `color-text-on-action` | znaczeniowa | `neutral-990` / `neutral-0` | kod R02 | tekst i znacznik na `color-action-primary` | gdziekolwiek indziej |
| `color-focus-ring` | znaczeniowa | `green-400` / `green-700` | kod R02 (`:focus-visible`); T6, przyjęta 2026-10-21 | obrys fokusu klawiatury | stan zaznaczenia |
| `color-text-danger` | znaczeniowa | `red-300` / `red-700` | kod R02; T5, przyjęta 2026-10-21 | komunikat błędu walidacji, np. minimum większe niż maksimum | przekroczenie kosztu (R02.3), „Ważne”, „Pilne” |
| `color-place-1` | znaczeniowa | `place-blue` / `place-blue` | Q3, Luki pkt 3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-2` | znaczeniowa | `place-ochre` / `place-ochre-deep` | Q3, Luki pkt 3, T3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-3` | znaczeniowa | `place-terracotta` / `place-terracotta` | Q3, Luki pkt 3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-4` | znaczeniowa | `place-green` / `place-green-deep` | Q3, Luki pkt 3, T3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-5` | znaczeniowa | `place-violet` / `place-violet` | Q3, Luki pkt 3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-6` | znaczeniowa | `place-pink` / `place-pink` | Q3, Luki pkt 3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-7` | znaczeniowa | `place-olive` / `place-olive-deep` | Luki pkt 3, T3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-8` | znaczeniowa | `place-plum-bright` / `place-plum` | Luki pkt 3, T2 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-9` | znaczeniowa | `place-teal` / `place-teal-deep` | Luki pkt 3, T4 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `color-place-10` | znaczeniowa | `place-slate` / `place-slate` | Luki pkt 3 | kropka obok nazwy miejsca | tło etykiety, tekst, działania |
| `font-family-base` | znaczeniowa | `font-instrument-sans` | Q4, Luki pkt 1 | cały interfejs | — |
| `font-size-meta` | znaczeniowa | `size-13` | Luki pkt 1 | druga linia wiersza, teksty pomocnicze | tytuł zadania, kwota |
| `font-size-body` | znaczeniowa | `size-15` | Luki pkt 1 | tytuł zadania, kwota, tekst | nagłówki ekranu |
| `font-size-heading` | znaczeniowa | `size-22` | Luki pkt 1 | nazwa listy, suma przyszłych wydatków | tytuły zadań |
| `font-weight-regular` | znaczeniowa | `weight-400` | Luki pkt 1 | tekst | tytuł zadania, kwoty |
| `font-weight-strong` | znaczeniowa | `weight-600` | Luki pkt 1 | tytuł zadania, kwoty | całe akapity, etykiety |
| `line-height-body` | znaczeniowa | `leading-145` | Luki pkt 1 (kod R02) | tekst 13 i 15px | nagłówek 22px |
| `line-height-heading` | znaczeniowa | `leading-125` | T9, przyjęta 2026-10-21 | tekst 22px | tekst 13 i 15px |
| `space-inline` | znaczeniowa | `space-4` | kod R02 (6px); T7, przyjęta 2026-10-21 | kropka i nazwa miejsca, ikona i tekst | między osobnymi elementami |
| `space-group` | znaczeniowa | `space-8` | T7, przyjęta 2026-10-21 | w grupie: miejsca, „Ważne”, „Pilne”, „1/3”; uchwyt, strzałka, checkbox; sąsiednie przyciski | między grupami |
| `space-between-groups` | znaczeniowa | `space-16` | T7, przyjęta 2026-10-21 | między grupami, np. treść wiersza i kwota | w obrębie grupy |
| `space-inset` | znaczeniowa | `space-16` | T7, przyjęta 2026-10-21 | wewnątrz panelu: wiersz w poziomie, rozwinięte szczegóły | między sekcjami |
| `space-section` | znaczeniowa | `space-32` | T7, przyjęta 2026-10-21 | między sekcjami: suma, szybkie dodawanie, lista | wewnątrz wiersza |
| `space-page-gutter` | znaczeniowa | `space-16` do 640px, `space-24` powyżej | kod R02 (16px); T7, przyjęta 2026-10-21 | margines boczny strony | wewnątrz listy |
| `space-page-top` | znaczeniowa | `space-48` | T7, przyjęta 2026-10-21 | odstęp nad treścią na komputerze | telefon |
| `radius-control` | znaczeniowa | `radius-8` | kod R02; T8, przyjęta 2026-10-21 | przyciski, pola | powierzchnia listy |
| `radius-surface` | znaczeniowa | `radius-12` | R01.1; T8, przyjęta 2026-10-21 | powierzchnia listy, linia sumy | kontrolki |
| `border-width` | znaczeniowa | 1px | R01.1, R02.1 | linie i obramowania | — |
| `layout-content-max-width` | znaczeniowa | 980px | kod R02 (szerokość listy); P01, R01.5 | kolumna treści | — |
| `motion-duration-quick` | znaczeniowa | `duration-150` | Luki pkt 8 | przeciąganie, zaznaczenie zadania | rozwinięcie wiersza |
| `motion-duration-base` | znaczeniowa | `duration-200` | Luki pkt 8 | rozwinięcie wiersza, przeniesienie ukończonego zadania na koniec | animacje ozdobne |
| `motion-easing` | znaczeniowa | `ease-out` | Luki pkt 8 | każde przejście | — |
| `task-row-min-height` | komponentu | 64px | Luki pkt 6 | wiersz zadania | inne listy |
| `task-row-padding-y` | komponentu | `space-12` | T10, przyjęta 2026-10-21 (12 + 22 + 18 + 12 = 64) | wiersz zadania | — |
| `task-row-indent` | komponentu | `space-24` | R02.1 (około 22px); T10, przyjęta 2026-10-21 | wcięcie podzadania na każdy poziom | — |
| `place-dot-size` | komponentu | 8px | kod R02 (9px); T10, przyjęta 2026-10-21 | kropka miejsca | — |
| `checkbox-size` | komponentu | 20px | R02.1; T10, przyjęta 2026-10-21 | checkbox zadania i podzadania | — |
| `checkbox-radius` | komponentu | `radius-6` | R02.1 (kwadratowy checkbox); T8, przyjęta 2026-10-21 | checkbox zadania i podzadania | — |
| `touch-target-min` | komponentu | 44px | Apple HIG, WCAG 2.5.5; T10, przyjęta 2026-10-21 | uchwyt, strzałka, „…”, checkbox na telefonie | — |
| `input-font-size-mobile` | komponentu | `size-16` | Luki pkt 1 | pola formularza na telefonie | tekst poza polami |

## Pary kolorów z kontrastem

Policzone 2026-10-21 wzorem WCAG 2.x. Progi: tekst 4,5:1, elementy interfejsu 3:1 (WCAG 1.4.11). Wartości: motyw ciemny / motyw jasny. Powierzchnie: strona, lista, wyniesiona.

**Tekst (próg 4,5:1)**

| Para | Ciemny | Jasny | Wynik |
|---|---|---|---|
| `color-text-primary` na stronie / liście / wyniesionej | 15,67 / 14,26 / 12,21 | 14,93 / 16,51 / 13,83 | spełnia |
| `color-text-muted` na stronie / liście / wyniesionej | 7,63 / 6,94 / 5,94 | 5,71 / 6,31 / 5,29 | spełnia |
| `color-action-primary` jako tekst na stronie / liście / wyniesionej | 7,37 / 6,70 / 5,74 | 5,74 / 6,35 / 5,32 | spełnia |
| `color-text-on-action` na `color-action-primary` | 7,32 | 6,35 | spełnia |
| `color-text-danger` na liście / wyniesionej | 6,89 / 5,90 | 5,71 / 4,78 | spełnia |

**Elementy interfejsu (próg 3:1)**

| Para | Ciemny | Jasny | Wynik |
|---|---|---|---|
| `color-action-primary` (zaznaczony checkbox) na liście | 6,70 | 6,35 | spełnia |
| `color-border-control` na liście / stronie / wyniesionej | 4,08 / 4,48 / 3,49 | 4,11 / 3,72 / 3,44 | spełnia (V3; przed V3 ok. 5,3–7,6) |
| `color-focus-ring` na stronie | 7,37 | 5,74 | spełnia |
| `color-border-divider` na liście / stronie | 1,38 / 1,52 | 1,39 / 1,26 | poniżej progu, przyjęte jako linia ozdobna (T1). Wiersze rozpoznaje się po treści; granice kontrolek używają `color-border-control` |

**Kropki miejsc (próg 3:1).** Ciemny: lista / wyniesiona. Jasny: lista / wyniesiona / strona.

| Token | Ciemny | Kontrast | Jasny | Kontrast | Uwagi |
|---|---|---|---|---|---|
| `color-place-1` | `#4F86B8` | 4,34 / 3,72 | `#4F86B8` | 3,86 / 3,24 / 3,49 | — |
| `color-place-2` | `#C79A2B` | 6,46 / 5,53 | `#A58024` | 3,68 / 3,08 / 3,32 | jasny przyciemniony; oryginał na wyniesionej 2,17 |
| `color-place-3` | `#B8674A` | 4,06 / 3,47 | `#B8674A` | 4,14 / 3,46 / 3,74 | — |
| `color-place-4` | `#4E9A6B` | 4,92 / 4,21 | `#4B9567` | 3,62 / 3,03 / 3,28 | jasny przyciemniony; oryginał na wyniesionej 2,86 |
| `color-place-5` | `#8A6BB0` | 3,84 / 3,29 | `#8A6BB0` | 4,37 / 3,66 / 3,95 | — |
| `color-place-6` | `#C2586F` | 3,93 / 3,36 | `#C2586F` | 4,27 / 3,57 / 3,86 | — |
| `color-place-7` | `#8E9B3F` | 5,52 / 4,73 | `#818C39` | 3,66 / 3,06 / 3,31 | jasny przyciemniony; oryginał na wyniesionej 2,54 |
| `color-place-8` | `#9F5D91` | 3,55 / 3,04 | `#9C5B8E` | 4,88 / 4,09 / 4,41 | ciemny rozjaśniony; oryginał na wyniesionej 2,94 |
| `color-place-9` | `#2F9AA8` | 5,04 / 4,31 | `#2D93A0` | 3,63 / 3,04 / 3,28 | turkusowa (T4); jasny przyciemniony, oryginał na wyniesionej 2,79 |
| `color-place-10` | `#6F8798` | 4,47 / 3,83 | `#6F8798` | 3,75 / 3,14 / 3,39 | — |

Rozróżnialność barw (ΔE2000, policzone 2026-10-21):
- Turkusowa (T4) zastąpiła piaskową, która w motywie jasnym miała ΔE 8,1 od najbliższej barwy. Turkusowa ma ΔE 14,3 / 13,7 (ciemny / jasny) od najbliższej (szaroniebieskiej) i 16,9 / 20,1 od `color-action-primary`.
- Najbliższa para w całej palecie to `color-place-1` i `color-place-10` (niebieska i szaroniebieska), ΔE 9,2 w obu motywach.
- `color-place-2` i `color-place-7` (ochra i oliwkowa) mają w motywie jasnym prawie tę samą jasność (kontrast między nimi 1,01), ale różnią się odcieniem: ΔE 15,2.
- Kropka zawsze stoi przy nazwie, więc kolor nie jest jedynym nośnikiem informacji.

Po każdej zmianie wartości koloru trzeba policzyć kontrast tych par jeszcze raz.

## Decyzje, które nie są tokenami

### Zasady

1. **Bez cieni, gradientów i tekstur.** Głębię daje ton powierzchni i linia. Przeciągany wiersz dostaje `color-surface-raised` zamiast cienia (R01.1).
2. **Kolor tylko w dwóch rolach.** Akcent oznacza działanie i stan „ukończone”; kolory miejsc pojawiają się tylko jako kropki (R01.2, R02.3, Q3).
3. **Kolor nigdy nie jest jedynym nośnikiem informacji.** Kropka zawsze stoi przy nazwie miejsca (Luki pkt 3).
4. **Hierarchia przez kolor tekstu.** Najwyżej trzy rozmiary i dwie grubości pisma; bez etykiet wersalikami (R01.3, Luki pkt 1, P12).
5. **Kwoty jako przedział.** Kwota ma postać „1 200–1 500 zł”, stoi po prawej i ma cyfry o równej szerokości (`font-variant-numeric: tabular-nums`) (P06, R02.5).
6. **Nie każdy element jest przyciskiem.** Puste pole to szary tekst zachęty do kliknięcia w kolorze `color-text-muted` (R01.4).
7. **Jedna kolumna treści o szerokości do `layout-content-max-width`, bez stałego paska bocznego** (P01, R01.5).
8. **Szczegóły zadania rozwijają się w wierszu.** Bez szuflad, bez okien nachodzących na treść, bez panelu w panelu (Q2, R02.6, A01.3).
9. **Jedna linia przyszłych wydatków zamiast kafelków.** Wersja 1 zawiera tylko swój zakres (P03, P04).
10. **Bez podpisów antyreferencji.** Unikamy generycznego wyglądu AI (A02), tablicy kolumn i przeładowanej karty (A01), formularzy z wieloma polami (A03), siatki kolumn arkusza (A04), żargonu i identyfikatorów zadań (A05).
11. **Ikony Lucide tylko tam, gdzie zastępują znany gest:** uchwyt przeciągania, strzałka rozwijania, menu „…”, plus przy dodawaniu, przełącznik motywu. Wszystko inne opisujemy słowem (Luki pkt 7).
12. **Ruch tylko funkcjonalny.** Przy `prefers-reduced-motion: reduce` wszystko dzieje się od razu. Ładowanie to statyczne paski w kolorze `color-surface-raised`, bez migającego połysku (P13, Luki pkt 8).
13. **Ton: po polsku, na „ty”.** Przyciski to czasowniki w trybie rozkazującym. Stany puste nazwane wprost. Zasada wyjaśniona jednym zdaniem tam, gdzie zmienia liczbę. Nazwy z glosariusza: zadanie, podzadanie, przyszłe wydatki, ukończone, szacunek, miejsce. E01 powstaje najpierw po angielsku (Luki pkt 5).
14. **Motyw.** Domyślnie ciemny. Przełącznik w aplikacji ma dwie pozycje: Ciemny i Jasny, bez pozycji „jak w systemie” (Q1, Luki pkt 2).
15. **`color-border-divider` tylko do linii ozdobnych;** granice pól i checkboxów mają `color-border-control` (T1).

### Cechy komponentów

- **Wiersz zadania** (Luki pkt 6, R02.1):
  - dwie linie; w pierwszej tytuł i kwota po prawej, w drugiej kropki z nazwami miejsc, „Ważne”, „Pilne” i „1/3”;
  - na telefonie kwota schodzi pod tytuł;
  - opis tylko po rozwinięciu wiersza;
  - podzadania wcięte o `task-row-indent` na każdy poziom.
- **Ukończone zadanie** (R02.2, Luki pkt 10):
  - tytuł wyciszony (`color-text-muted`) i przekreślony;
  - na końcu listy, a ukończone podzadanie na końcu podzadań swojego zadania; to tylko sposób wyświetlania, zapisana kolejność się nie zmienia;
  - nie da się go przeciągać;
  - otwarte ponownie wraca na początek listy.
- **Markery:** słowa „Ważne” i „Pilne” w kolorze `color-text-muted`, bez ikon (Luki pkt 4).
- **Miejsce:**
  - kropka `color-place-N` o średnicy `place-dot-size` przy nazwie;
  - pierwsze sześć miejsc dostaje po kolei `color-place-1`–`color-place-6`;
  - kolejne wybierają z dziesięciu barw jedną, której nie ma jeszcze żadne miejsce;
  - barwę można zmienić (Luki pkt 3).
- **Suma przyszłych wydatków:** jedna linia w rozmiarze `font-size-heading`. Pod nią zwinięta linia „N zadań bez szacunku”, a po rozwinięciu lista z przyciskiem „Dodaj szacunek” przy każdym zadaniu (P04, Luki pkt 9).
- **Szybkie dodawanie:** wystarczy sam tytuł; widoczny przycisk „Dodaj podzadanie” (R02.9, P05, P09).
- **Nawigacja na telefonie:** na dole ekranu, tyle pozycji, ile miejsc ma wersja 1 (P07).
- **Przełącznik motywu:** dwie pozycje, Ciemny i Jasny (Luki pkt 2).
