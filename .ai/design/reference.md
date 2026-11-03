# Referencje: Taskly

- Data: 2026-10-21
- Kto wybierał: product owner (referencje, opisy i odpowiedzi na pytania z 2026-10-21); obserwacje i propozycje spisał agent.
- Źródła: notatki do referencji `reference/reference.md`, brief `.ai/specs/product-brief.md`, wywiady w `.ai/specs/research/`.
- Słowa charakteru (potwierdzone 2026-10-21): **prosty, czytelny, oszczędny** (w kolorze i ozdobach), **rzeczowy, spokojny**.
- Antycharakter (potwierdzony 2026-10-21): **jaskrawy, rozproszony** (wiele paneli i okien), **przeładowany, techniczny, generyczny**.

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym kroku, z tego pliku, i każdą z nich zatwierdza product owner osobno.

Oznaczenia: Q1–Q5 to pytania, a P01–P15 propozycje agenta z rozmowy z 2026-10-21; przy każdej podano odpowiedź product ownera. Wartości liczbowe pochodzą ze zrzutów (przybliżone) albo z kodu `R02-prototype.html` (dokładne).

## Referencje

| # | Referencja | Źródło | Kto wybrał | Obserwacja | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status (propozycja / przyjęte) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.1 | Linear, widok projektu | `reference/R01-linear.png` | product owner | Ciemny motyw. Tło prawie czarne, panele o ton jaśniejsze, oddzielone cienką linią o niskim kontraście i zaokrągleniem. Brak cieni, gradientów i tekstur. Tekst jasnoszary, drugorzędny szary. | Ciemny motyw jako domyślny (Q1). Powierzchnie różnią się tonem i cienką linią, nie cieniem. | Cieni, gradientów, tekstur. | — | Produkt to lista zadań i kwot; nic nie powinno konkurować z treścią („focused on the content”). Ciemny motyw to wybór gustu (Q1), bez dowodu z badań. | kolor | inspiracja; motyw rozstrzygnięty w Q1 | przyjęte |
| R01.2 | Linear | `reference/R01-linear.png` | product owner | Kolor występuje tylko w małych ikonach statusu (żółta „In Progress”, zielona „Requires QA”, fioletowa „Completed”) i na liniach wykresu. Reszta interfejsu jest w odcieniach szarości. | Kolor tylko na kilku kluczowych elementach. | Kolorowych ikon statusów (wersja 1 ma tylko „ukończone” i dwa markery). | Pokoje oznacza mała kolorowa kropka przy nazwie (Q3). | Użytkownik ma szybko znaleźć zadanie i jego koszt; mało koloru oznacza, że ten, który jest, coś znaczy. | kolor | inspiracja | przyjęte |
| R01.3 | Linear | `reference/R01-linear.png` | product owner | Jeden krój bezszeryfowy. Duży i pogrubiony jest tylko tytuł projektu (~32px); pozostały tekst ma jeden rozmiar (~17px). Hierarchię robi kolor tekstu (jasny i szary), nie rozmiar ani grubość. | Jeden krój; hierarchia kolorem tekstu (Q4). | Drugiego kroju do nagłówków. | — | Mało poziomów tekstu to mniej do odczytania przy szybkim wyborze następnego zadania (problem z briefu: koszt „gubi się w szybkim myśleniu”). | typografia | inspiracja; rozstrzygnięte w Q4 | przyjęte |
| R01.4 | Linear | `reference/R01-linear.png` | product owner | Właściwości („Properties”) to zwykły tekst z ikoną, nie przyciski z ramką. Puste pola to szary tekst zachęty do kliknięcia („Add a short summary…”, „Add description…”). Dodawanie to szary tekst z plusem („+ Add document or link…”). | Nie każdy element jest przyciskiem. Puste pole to szary tekst do kliknięcia. | — | — | Zadanie może nie mieć opisu ani szacunku (R10); szary tekst pokazuje brak bez dodatkowych ramek i przycisków. | komponenty | inspiracja | przyjęte |
| R01.5 | Linear | `reference/R01-linear.png` | product owner | Dużo pustej przestrzeni w kolumnie głównej. Ekran ma trzy strefy: lewy pasek z ~20 pozycjami (Inbox, Workspace, Favorites…), kolumnę główną i prawy panel z wykresem. U góry okna rząd zakładek. | Oddech wokół treści. | Lewego paska z wieloma pozycjami; układu strony; prawego panelu. | Brak stałego paska bocznego; wersja 1 ma dwa miejsca: listę i przyszłe wydatki (P01). Jedna kolumna treści. | Wersja 1 to jedna lista z jednym podsumowaniem (D19); stałe menu nie miałoby czego pokazywać. | kompozycja i gęstość | inspiracja | przyjęte |
| R01.6 | Linear | `reference/R01-linear.png` | product owner | Wykres postępu z liniami „Scope / Started / Completed”, identyfikatory zadań („EA-490”, „EA-123”), procenty postępu przy osobach. | — | Wykresu postępu, identyfikatorów zadań, zakładek u góry okna (P02). | Zadanie nazywa się tylko tytułem; jedyne liczby na liście to kwoty. | Użytkownicy to nie programiści („nie jestem informatykiem”); jedynym podsumowaniem wersji 1 są przyszłe wydatki (D19). | komponenty | inspiracja | przyjęte |
| R02.1 | Prototyp „Roomlist”, lista zadań | `reference/R02-prototype.html`, `reference/R02-lista-zadan.png` | product owner | Lista to jedna ciągła powierzchnia; wiersze dzieli linia 1px. Wiersz (~66px): uchwyt przeciągania (6 kropek), strzałka rozwijania, kwadratowy checkbox, tytuł, pod nim etykieta pokoju i „1/3 done”; po prawej kwota i menu „…”. Podzadania wcięte o ~22px na poziom. | Układ listy: jeden wiersz na zadanie, podzadania wcięte pod zadaniem, uchwyt przeciągania i checkbox na początku wiersza. | — | — | Problem właściciela to wybór następnego zadania z wielu drobnych; lista pokazuje wszystkie naraz i pozwala zmienić kolejność (moved-in owner: w notatkach „nie poprzesuwam tego”). | kompozycja i gęstość | pożądane | przyjęte |
| R02.2 | Prototyp | `reference/R02-lista-zadan.png` | product owner | Ukończone zadanie: zaznaczony checkbox w kolorze akcentu i przekreślony, szary tytuł; wiersz zostaje na miejscu. | Ukończone zadanie zostaje na liście, wyciszone. | Pozostawienia ukończonego zadania w jego miejscu w kolejności. | Ukończone zadanie przesuwa się na koniec listy; ukończone podzadanie na koniec podzadań swojego zadania; zadanie otwarte ponownie wraca na początek listy (product owner, 2026-10-21; szczegóły w Luki, pkt 10). | Ukończone zadanie można otworzyć ponownie (R11), więc musi być widoczne; na końcu listy nie przeszkadza w wyborze następnego zadania spośród otwartych. | komponenty | pożądane | przyjęte |
| R02.3 | Prototyp | kod `R02-prototype.html`, `reference/R02-lista-zadan.png` | product owner | Jeden kolor akcentu: ciemna zieleń `#1E6B5A` (w trybie ciemnym `#4CB59B`) na przycisku głównym, zaznaczonym checkboxie i podkreśleniu aktywnej zakładki. Czerwień `#B83A2B` dla przekroczenia kosztu. Etykiety pokoi to pastelowe pigułki, każdy pokój w innej barwie (6 barw). | Jeden kolor akcentu (zieleń z R02, „color scheme is to my taste”). | Pełnych pastelowych pigułek pokoi; czerwieni przekroczenia kosztu (wersja 1 nie ma kosztu rzeczywistego, D17). | Miejsce: kropka koloru przy nazwie, tekst neutralny (Q3, Luki pkt 3). | Akcent wskazuje działanie i stan „ukończone”, nic więcej; zgodne z R01.2. | kolor | pożądane | przyjęte |
| R02.4 | Prototyp | kod `R02-prototype.html` | product owner | Dwa kroje: Bricolage Grotesque 600/700 (nagłówki, liczby; h1 28px) i Instrument Sans 400–700 (tekst, 15px, interlinia 1,45). Etykiety 11,5px wersalikami z rozstrzeleniem .06em. Cyfry o równej szerokości (`tabular-nums`). | Jeden krój z R02: Instrument Sans (Q4, Luki pkt 1); cyfry o równej szerokości (P06). | Drugiego kroju (Bricolage Grotesque); etykiet wersalikami (P12). | Hierarchia kolorem tekstu, jak R01.3. | Kwoty w kolumnie mają się dać porównać wzrokiem; równe cyfry ustawiają je jedna pod drugą. | typografia | pożądane | przyjęte |
| R02.5 | Prototyp | `reference/R02-lista-zadan.png` | product owner | Kwota stoi po prawej stronie wiersza, wyrównana do prawej („Est. 12 610 zł”, pod nią „5239 zł spent”). Brak kwoty: szary tekst „No cost yet”. | Kwota wyrównana do prawej w wierszu, jako przedział „1 200–1 500 zł” (P06). | Drugiej kwoty („spent”), D17. | — | Koszt to „najważniejsza część” dla właściciela (brief, Kill criteria); stałe miejsce kwoty pozwala porównać zadania bez otwierania ich. Szacunek to przedział (R07). | komponenty | pożądane | przyjęte |
| R02.6 | Prototyp, szczegóły zadania | `reference/R02-szczegoly-zadania.png` | product owner | Szczegóły zadania wysuwają się z prawej jako szuflada na pełną wysokość i zasłaniają część listy. W środku szary panel „Cost” z trzema kolumnami liczb i formularzem (panel w panelu). | Czytelność szczegółów („Task details are readable”). | Szuflady; panelu w panelu („Too much separated windows and panels”). | Szczegóły rozwijają się w miejscu, w wierszu na liście (Q2). | Użytkownik nie traci z oczu kolejności i reszty zadań, gdy czyta jedno. | kompozycja i gęstość | pożądane | przyjęte |
| R02.7 | Prototyp | `reference/R02-lista-zadan.png`, `reference/R02-telefon.png` | product owner | Nad listą rząd czterech kafelków z ramką: etykieta wersalikami i duża liczba (Estimated, Spent, Budget left, Tasks done). Na telefonie siatka 2×2. | — | Kafelków (P04, P12). | Jedna linia: „Przyszłe wydatki: 12 000–15 000 zł” (P04). | Wersja 1 ma jedno podsumowanie, przyszłe wydatki jako przedział (D19, R08). | kompozycja i gęstość | pożądane | przyjęte |
| R02.8 | Prototyp | `reference/R02-szczegoly-zadania.png`, `reference/R02-podsumowanie.png` | product owner | Elementy spoza wersji 1: Spent, Budget left, Budget, Variance, zakładka Shopping, Share, awatary, rola „Owner”, przycisk „Estimate with AI” z ikoną ✨, eksport CSV. | — | Wszystkich tych elementów (P03). | Tylko zakres wersji 1 z briefu. | Pole budżetu stoi w sprzeczności z D06 i N04 (nie przechowujemy pieniędzy do wydania); reszta to wersja 2 (D11, D17, D18, N02). | komponenty | pożądane | przyjęte |
| R02.9 | Prototyp | `reference/R02-lista-zadan.png` | product owner | Szybkie dodawanie nad listą: pole „Add a task and press Enter”, wybór etykiety, przycisk „Add”. Podpowiedź: Tab zagnieżdża następne zadanie, Shift+Tab cofa. | Dodawanie zadania samym tytułem. | Tab jako jedynej drogi do zagnieżdżania (P05). | Widoczne „Dodaj podzadanie” (P05). | Rozmówcy chcą „prostego i szybkiego narzędzia”, nie „wpisywania miliona informacji” (A03); Tab nie działa na telefonie (PWA). | komponenty | pożądane | przyjęte |
| R02.10 | Prototyp, podsumowanie | `reference/R02-podsumowanie.png` | product owner | Strona podsumowania: kafelki, pasek budżetu, tabela kosztów według pokoi, na dole lista „Not estimated” z przyciskiem „Add estimate” i zdaniem „These count as zero until they have an estimate.” | Pod sumą lista zadań bez szacunku, z możliwością dodania szacunku. | Kafelków, budżetu, tabeli według pokoi (P03, P04); listy zawsze rozwiniętej. | Zwinięta linia „3 zadania bez szacunku”, po rozwinięciu lista z „Dodaj szacunek” (Luki pkt 9). | Zadanie bez szacunku wypada z przyszłych wydatków (R10); bez tej informacji suma wygląda na pełną. | kompozycja i gęstość | pożądane („Summary page is also very good and clear”) | przyjęte |
| R02.11 | Prototyp, telefon | `reference/R02-telefon.png` | product owner | Na szerokości 390px nawigacja to dolny pasek z trzema pozycjami (ikona, podpis, licznik); górny pasek zwęża się do nazwy i ikon. | Nawigacja na dole na telefonie (P07). | Pozycji ponad liczbę miejsc wersji 1 (P07). | Tyle pozycji, ile miejsc ma wersja 1. | Przyjaciel właściciela chce „jednego miejsca na telefonie”; produkt działa jako PWA. | kompozycja i gęstość | pożądane | przyjęte |
| R02.12 | Prototyp | kod `R02-prototype.html` | product owner | Ruch: `transition: transform .15s` przy przeciąganiu, połysk szkieletu ładowania 1,2s, spinner 0,7s. Przy `prefers-reduced-motion: reduce` animacje i przejścia trwają 0,01ms. | Tylko krótkie przejścia, które coś znaczą: przeciąganie, rozwinięcie wiersza, zaznaczenie zadania; respektujemy ograniczony ruch (P13). | Animacji ozdobnych (P13); migającego połysku przy ładowaniu. | Czasy 150/200ms, ease-out; ładowanie jako statyczne szare paski (Luki pkt 8). | Spokojny charakter; ruch tylko potwierdza działanie użytkownika. Brak referencji wskazanej przez product ownera, rodzina oparta na P13. | ruch i reakcja | pożądane | przyjęte |
| R02.13 | Prototyp | `reference/R02-lista-zadan.png`, `reference/R02-szczegoly-zadania.png` | product owner | Teksty: krótkie zdania i stany puste nazwane wprost („No cost yet”, „No subtasks yet.”); podpowiedzi pod polem („Press Tab to nest…”); zasada wyjaśniona jednym zdaniem („These count as zero until they have an estimate.”). | Krótkie, rzeczowe nazwy stanów pustych; zasada wyjaśniona jednym zdaniem tam, gdzie wpływa na liczbę. | Podpowiedzi opartych na skrótach klawiszowych (P05, P11). | Po polsku, na „ty”; przyciski czasownikiem w trybie rozkazującym (Luki pkt 5). | Charakter „rzeczowy”; R10 wymaga wyjaśnienia, czemu suma pomija zadanie. | ton wypowiedzi | pożądane | przyjęte |

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło (gust / badania / propozycja) |
|---|---|---|---|---|
| A01.1 | Todoist: jaskrawy pasek na białym tle (`reference/A01-todoist.png`) | „Too bright”. Zamiast tego: ciemny motyw (Q1), kolor tylko na kluczowych elementach (R01.2). | Na ekranie: pasek górny na całą szerokość w nasyconej czerwieni, pod nim czysta biel; kolor marki jako tło dużej powierzchni. W kodzie: nasycony kolor jako `background` paska lub sekcji, `#fff` jako tło strony. | gust |
| A01.2 | Todoist: tablica kolumn | „In our case it needs to be a list.” Zamiast tego: jedna lista wierszy (R02.1). | Na ekranie: kolumny statusów obok siebie (Backlog, In progress, Done, QA), przewijanie w poziomie, każde zadanie na osobnej karcie z ramką i odstępem. W kodzie: komponenty typu Board / Column / Card, siatka kolumn według statusu. | gust |
| A01.3 | Todoist: przeładowana karta zadania | Za dużo informacji na jednym zadaniu i okno nachodzące na treść (P08). Zamiast tego: wiersz z tytułem, pokojami, markerami i kwotą; szczegóły rozwijają się w miejscu (Q2). | Na ekranie: okrągłe checkboxy w kolorze priorytetu; licznik czasu („2h 30m of 15h”, „Stop”); rząd drobnych ikon (komentarze, tag, data, awatar); okno szczegółów nałożone na tablicę; numerowane kółka adnotacji. | propozycja (przyjęta, P08) |
| A02 | Generyczny wygląd AI | Wygląda jak każdy wygenerowany interfejs, nic nie mówi o produkcie (antycharakter „generyczny”). Obejmuje też elementy R02: kafelki, ✨, panel w panelu, etykiety wersalikami (P12). | Na ekranie: gradienty fiolet–niebieski; ikona ✨ przy funkcjach AI; karta w karcie; siatka kafelków z liczbą i etykietą wersalikami; pastelowe pigułki wszędzie; cień pod każdą kartą; gradientowy tekst nagłówka. W kodzie: Inter jako jedyny krój bez decyzji, `bg-gradient-to-*`, `shadow-*` na każdej karcie, `uppercase tracking-wide` na każdej etykiecie, `rounded-2xl` wszędzie. | propozycja (przyjęta, P12) |
| A03 | Rozbudowana aplikacja | Moved-in owner: „to ma być proste i szybkie narzędzie intuicyjne, a nie skomplikowane wpisywanie miliona informacji o projekcie domu czy zadaniu”. Future owner: aplikacje są „za bardzo rozbudowane, ja potrzebuję coś prostego”. Zamiast tego: dodanie samym tytułem, reszta później (R02.9). | Na ekranie: formularz z wieloma polami przy tworzeniu zadania, pola wymagane poza tytułem, kreator w kilku krokach, ustawienia projektu przed pierwszym zadaniem. W kodzie: schemat tworzenia z wieloma polami wymaganymi, modal z formularzem jako jedyna droga dodania. | badania (propozycja przyjęta, P09) |
| A04 | Arkusz kalkulacyjny | Future owner: „chciałem zrobić to w excelu ale zrobił się chaos”; moved-in owner uznaje Excel za nieprzydatny. Zamiast tego: jeden wiersz na zadanie i najwyżej jedna kwota (R02.5). | Na ekranie: siatka wielu kolumn, edycja w komórkach, przewijanie w poziomie, nagłówki kolumn z sortowaniem. W kodzie: komponent tabeli danych z wieloma kolumnami jako widok główny. | badania (propozycja przyjęta, P10) |
| A05 | Narzędzie dla informatyka | Future owner: „nie jestem jakimś informatykiem i specem od technologii”. Zamiast tego: zwykłe słowa i każda funkcja dostępna widocznym elementem (R01.6, R02.9). | Na ekranie: identyfikatory zadań („EA-490”), żargon (issue, backlog, cycle, scope), funkcje dostępne tylko ze skrótu klawiszowego, paleta poleceń jako główna nawigacja. W kodzie: akcje bez widocznego przycisku, tylko obsługa klawiszy. | badania (propozycja przyjęta, P11) |

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| Motyw: ciemny w R01, jasny szarozielony w R02, „za jasny” w A01 | R01.1, R02.3, A01.1 | Ciemny motyw jako domyślny, jak R01 (Q1). Czy istnieje też tryb jasny i które wartości ciemne bierzemy: Luki. | product owner, 2026-10-21 |
| Liczba paneli: R01 „minimum separated windows and panels”, R02 „too much separated windows and panels” przy jednoczesnym „I like the layout” R02, który stoi na szufladzie, kafelkach i kartach | R01.5, R02.6, R02.7 | Szczegóły rozwijają się w miejscu, w wierszu listy (Q2); kafelki zastępuje jedna linia przyszłych wydatków (P04). | product owner, 2026-10-21 |
| Kolor: R01 ogranicza kolor do kilku elementów, R02 daje każdemu pokojowi własną barwę | R01.2, R02.3 | Pokój oznacza mała kolorowa kropka, tekst etykiety neutralny (Q3). | product owner, 2026-10-21 |
| Typografia: R01 jeden krój i hierarchia kolorem, R02 dwa kroje i hierarchia rozmiarem | R01.3, R02.4 | Jeden krój, Instrument Sans; hierarchia kolorem (Q4, Luki pkt 1). | product owner, 2026-10-21 |
| R02 zawiera podpis generycznego wyglądu AI (kafelki z etykietą wersalikami, ✨, panel w panelu) | R02.4, R02.7, R02.8, A02 | Te elementy R02 odrzucamy (P12). | product owner, 2026-10-21 |
| R02 „całość mi się podoba”, ale prototyp ma funkcje spoza wersji 1, w tym budżet sprzeczny z D06 | R02.8, R02.10 | Bierzemy tylko zakres wersji 1 (P03). | product owner, 2026-10-21 |
| Paleta R02 podobała się („color scheme is to my taste”), ale jest jasna, a motyw ma być ciemny | R02.3, R01.1 | Ciemny motyw domyślny z wartościami trybu ciemnego z kodu R02; tryb jasny włączany przełącznikiem w aplikacji (Luki, pkt 2). | product owner, 2026-10-21 |

## Luki

Pytania otwarte i propozycje do przyjęcia lub odrzucenia każda osobno:

Wszystkie punkty rozstrzygnął product owner 2026-10-21. Jedyna otwarta rzecz to odcienie barw miejsc w trybie jasnym (pkt 3), do ustalenia w kroku tokenów. Opcje były propozycjami agenta; zapisano wybraną.

1. **Typografia.** Rozstrzygnięte:
   - **Instrument Sans** jako jedyny krój (Q4). Bricolage Grotesque z R02 odpada.
   - Trzy rozmiary: 13px (druga linia wiersza, teksty pomocnicze), 15px (tytuł zadania, kwota, tekst; interlinia 1,45 jak w R02), 22px (nazwa listy, suma przyszłych wydatków).
   - Dwie grubości: 400 (tekst) i 600 (tytuł zadania, kwoty).
   - Pola formularza na telefonie mają co najmniej 16px, bo przy mniejszych iOS przybliża stronę przy wpisywaniu.
2. **Kolor: motywy.** Rozstrzygnięte:
   - Ciemny motyw jest domyślny (Q1), z wartościami trybu ciemnego z kodu R02: tło `#101513`, powierzchnia `#181F1C`, druga powierzchnia `#232C28`, tekst `#E8EEEA`, tekst drugorzędny `#9CAAA3`, linia `#2E3834`, akcent `#4CB59B`.
   - Tryb jasny istnieje i włącza się **przełącznikiem w aplikacji**.

   - Tryb jasny ma wartości trybu jasnego z kodu R02: tło `#F2F4F1`, powierzchnia `#FFFFFF`, druga powierzchnia `#E8ECE7`, tekst `#17211D`, tekst drugorzędny `#55635C`, linia `#D6DCD5`, akcent `#1E6B5A`.
   - Przełącznik ma dwie pozycje: Ciemny i Jasny; domyślnie Ciemny. Bez pozycji „jak w systemie”.
3. **Kolor: kropki miejsc.** Rozstrzygnięte:
   - Sześć barw z R02: niebieska `#4F86B8`, ochra `#C79A2B`, terakota `#B8674A`, zielona `#4E9A6B`, fioletowa `#8A6BB0`, różowa `#C2586F`. Kropka zawsze stoi obok nazwy, więc kolor nie jest jedynym nośnikiem informacji.
   - ~~Dla kolejnych miejsc użytkownik wybiera dowolną barwę z palety kolorów, której nie ma jeszcze żadne miejsce.~~ Od 2026-11-03 (D26): aplikacja przydziela barwę każdemu miejscu po kolei z 10 barw palety, także gotowym miejscom; od jedenastego miejsca barwy się powtarzają (nazwa zawsze stoi obok kropki). Miejsc może być najwyżej 20 (wcześniej 10, decyzja G5).

   - Paleta to ustalony zestaw 10 barw, nie dowolny selektor: sześć z R02 i cztery dodatkowe: oliwkowa `#8E9B3F`, śliwkowa `#9C5B8E`, ~~piaskowa `#B0976A`~~ turkusowa `#2F9AA8`, szaroniebieska `#6F8798`. Więcej barw zaczyna się mylić w małych kropkach. Piaskową zastąpiła turkusowa 2026-10-21 (decyzja T4 w `tokeny.md`): w motywie jasnym piaskowa myliła się z ochrą i oliwkową.
   - Sześć barw z R02 dostają automatycznie, po kolei, pierwsze miejsca; użytkownik może barwę zmienić. Od 2026-11-03 automatycznie dostają barwę wszystkie miejsca (punkt wyżej); zmiana barwy w edycji miejsca zostaje.
   - Każda barwa ma kontrast co najmniej 3:1 (WCAG 1.4.11) na powierzchni obu motywów. Każda dostaje osobny odcień do trybu jasnego, tak jak akcent.

   Kontrast policzony 2026-10-21 (ciemna powierzchnia `#181F1C` / jasna powierzchnia `#FFFFFF`): niebieska 4,3 / 3,9; ochra 6,5 / **2,6**; terakota 4,1 / 4,1; zielona 4,9 / 3,4; fioletowa 3,8 / 4,4; różowa 3,9 / 4,3; oliwkowa 5,5 / 3,0; śliwkowa 3,4 / 4,9; piaskowa 6,0 / **2,8**; szaroniebieska 4,5 / 3,8. Na jasnym tle `#F2F4F1` wartości są niższe o 0,3–0,4.

   Odcienie do trybu jasnego ustalono w kroku tokenów 2026-10-21; wartości i kontrast w `tokeny.md`.
4. **Markery „ważne” i „pilne” (D07).** Rozstrzygnięte: krótkie słowa „Ważne” i „Pilne” w kolorze tekstu drugorzędnego, obok miejsc. Bez ikon i bez koloru akcentu.
5. **Ton wypowiedzi.** Rozstrzygnięte:
   - Język (Q5): interfejs głównie po polsku, z wersją angielską. Cała wersja 1 (E01–E03) powstaje po angielsku, a tłumaczenie na polski robimy raz, na końcu wersji 1 (product owner, 2026-11-03; wcześniej: najpierw po angielsku tylko E01). Nazwy gotowych miejsc są po polsku od razu, bo to dane właściciela (D26).
   - Ton: krótko, na „ty”. Przyciski to czasownik w trybie rozkazującym („Dodaj zadanie”, „Ukończ”). Stany puste nazwane wprost („Brak szacunku”). Zasada wyjaśniona jednym zdaniem tam, gdzie zmienia liczbę („Zadania bez szacunku nie wliczają się do sumy.”).
   - Nazwy: task → zadanie, subtask → podzadanie, future expenses → przyszłe wydatki, completed → ukończone, estimate → szacunek, space → **miejsce**.
6. **Wiersz zadania.** Rozstrzygnięte 2026-10-21:
   - Dwie linie, jak w R02 (około 64px). Pierwsza: tytuł, po prawej kwota. Druga: kropki z nazwami miejsc, „Ważne”, „Pilne”, liczba ukończonych podzadań („1/3”). Na telefonie kwota schodzi pod tytuł, jak w `reference/R02-telefon.png`.
   - Liczba „1/3” zostaje przy zadaniu z podzadaniami; podpowiada, że zadanie można zamknąć (R11).
   - Opis zadania widać tylko po rozwinięciu wiersza.
7. **Ikony.** Rozstrzygnięte 2026-10-21:
   - Zestaw Lucide (ikony konturowe, kreska 2px; domyślny zestaw shadcn/ui).
   - Ikony tylko tam, gdzie zastępują znany gest: uchwyt przeciągania, strzałka rozwijania, menu „…”, plus przy dodawaniu, przełącznik motywu. Wszystko inne jest opisane słowem.
8. **Ruch i reakcja.** Żadna referencja nie została wybrana ze względu na ruch; podstawa to P13 i kod R02 (R02.12). Rozstrzygnięte 2026-10-21:
   - 150ms: przeciąganie, zaznaczenie zadania (jak 0,15s w R02).
   - 200ms: rozwinięcie wiersza, przeniesienie ukończonego zadania na koniec listy.
   - Zawsze krzywa ease-out.
   - Przy `prefers-reduced-motion: reduce` wszystko dzieje się od razu.
   - Ładowanie: statyczne szare paski, bez migającego połysku z R02.
9. **Zadania bez szacunku przy sumie (R02.10).** Rozstrzygnięte 2026-10-21: pod sumą przyszłych wydatków stoi zwinięta linia „3 zadania bez szacunku”; po rozwinięciu lista tych zadań z przyciskiem „Dodaj szacunek” przy każdym.
10. **Ukończone na końcu listy (R02.2), szczegóły zachowania.** Rozstrzygnięte w całości przez product ownera 2026-10-21. Zapisane jako wejście do przyszłych specyfikacji E02 i E03 w `.ai/specs/research/decisions/2026-10-21-completed-tasks-order.md`, razem z decyzją, że serwer odrzuca przesunięcie ukończonego zadania:
    - ukończone podzadanie spada na koniec podzadań swojego zadania;
    - zadanie otwarte ponownie (R11) wraca na początek listy (podzadanie: na początek podzadań swojego zadania; to odczytanie agenta).

    Rekomendacja agenta, przyjęta przez product ownera 2026-10-21: **„koniec listy” to sposób wyświetlania, nie zmiana zapisanej kolejności.**
    - Lista sortuje najpierw otwarte, potem ukończone, a w każdej grupie według `position COLLATE "C"`.
    - Ukończenie zmienia tylko status. `position` zostaje, więc kaskada R09 (ukończenie zadania kończy podzadania) nie zapisuje kolejności wielu wierszy.
    - Ponowne otwarcie to jeden `UPDATE` jednego wiersza: status i nowa `position` przed pierwszym rodzeństwem. Zgodne z zasadą „jeden przesunięty wiersz = jeden `UPDATE`”.
    - Konsekwencja: ukończone ustawiają się w kolejności planu, nie w kolejności ukończenia.
    - Ukończonych zadań i podzadań nie przeciągamy (przyjęte 2026-10-21).
    - Odrzucona alternatywa: przy ukończeniu zapisywać `position` za ostatnim rodzeństwem. Wymaga blokady listy jak przy dopisywaniu i dodatkowego zapisu przy każdym ukończeniu.

    To ustalenia o zachowaniu, nie o wyglądzie; dotyczą E03-S01 (#20) i E02-S01 (#17).

## Obrazy

Pliki w `reference/` obok tego dokumentu:

- `reference/R01-linear.png`: Linear, widok projektu (zrzut od product ownera).
- `reference/R02-prototype.html`: prototyp „Roomlist” (plik od product ownera; karta podawała `.png`).
- `reference/R02-lista-zadan.png`: R02, lista zadań, 1440px (zrzut agenta, P14).
- `reference/R02-szczegoly-zadania.png`: R02, szuflada szczegółów zadania (zrzut agenta, P14).
- `reference/R02-podsumowanie.png`: R02, strona podsumowania (zrzut agenta, P14).
- `reference/R02-telefon.png`: R02, lista na telefonie, 390px (zrzut agenta, P14).
- `reference/A01-todoist.png`: Todoist z Everhour, widok tablicy (zrzut od product ownera).
- `reference/reference.md`: oryginalne opisy referencji od product ownera.
