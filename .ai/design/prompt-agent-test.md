# Zadanie

Zbuduj nowy ekran, korzystając wyłącznie z design systemu tego projektu.
Celem nie jest sam ekran, tylko sprawdzenie, czy design system wystarcza.

# Kontekst

- Potrzeba użytkownika: właściciel zapomina drobne zakupy, które nie należą do żadnego dużego zadania (zamek do drzwi, klej, nawóz do trawy), a kupuje je „przy okazji”, będąc na mieście. Chce dopisać rzecz w kilka sekund i odhaczyć ją w sklepie, jedną ręką na telefonie (brief, Evidence).
- Ekran: jedna lista zakupów właściciela, pod tym samym paskiem górnym co lista zadań. Dodawanie samą nazwą. Odhaczenie oznacza „kupione”. Rzecz można poprawić i usunąć.
- Szerokości: 320 px (główna), 768 i 1440 px. Oba motywy. Teksty po angielsku i story po polsku.
- Stany do pokazania: ładowanie, pusto (pierwsze wejście), błąd ładowania, dodawanie w toku, dodawanie nieudane, poprawianie nazwy, usuwanie, wszystko kupione, dużo pozycji, długie nazwy.
- Poza zakresem: udostępnianie i role (N02), ceny i kwoty, powiązanie rzeczy z zadaniem, AI.
- Dane w przykładach: tylko z briefu i specyfikacji (np. „Door lock”, „Glue”, „Grass fertilizer”), bez wymyślonych liczb.
- Co agent oddaje: story ekranu (`Product/Shopping/Screens`, na osobnej gałęzi), mapę stanów (który stan pokazuje która story) i **listę każdego miejsca, w którym zgadywał**, z informacją, czego szukał i gdzie.
- Czego agent nie robi: nowych komponentów, wariantów ani tokenów; brakujące rzeczy wpisuje do swojej listy zamiast je dodawać.
- Po teście: każde miejsce zgadywania uzupełniam w dokumentacji albo wpisuję do „What is missing”.
- Design system: packages/ui/src/styles/tokens.css, packages/ui/src/, packages/ui/.storybook, .ai/docs/design-system.md, AGENTS.md
- Co ma być na ekranie: lista zakupów, przycisk dodawania, możliwość odhaczenia, poprawienia i usunięcia pozycji.
- Gdzie zapisać ekran: packages/ui/.storybook/docs/product/shopping/Screens.stories.tsx (tytuł `Product/Shopping/Screens`). Ekran składasz w pliku story z komponentów eksportowanych z `@taskly/ui`; nic nie dodajesz w packages/ui/src/.
- Język interfejsu: taki jak w projekcie (sprawdź .ai/docs/design-system.md › Content: produkt po polsku, story najpierw po angielsku)

# Zasady

1. Używaj tylko komponentów, tokenów i wzorców, które istnieją w design systemie.
2. Nie dodawaj nowych kolorów, odstępów, promieni, wariantów ani komponentów.
3. Możesz składać ekran z istniejących komponentów i klas. Nie twórz nowego
   komponentu wielokrotnego użytku. Jeśli czegoś brakuje, nie wymyślaj tego
   po cichu: zapisz to jako lukę i użyj najbliższego istniejącego rozwiązania.
4. W tym teście nie dodawaj testów, eksportów ani wpisów w konfiguracji.
   Wystarczy ekran i jego przykład w Storybooku.

# Krok 1. Zanim napiszesz kod

Wypisz wszystkie decyzje, których wymaga ten ekran: układ, komponenty, stany,
odstępy, kolory, teksty, zachowanie przy błędzie, zachowanie na telefonie.
Każdą decyzję oznacz jednym z trzech:
- REGUŁA: odpowiedź jest zapisana jako zasada (podaj plik i miejsce),
- PRZYKŁAD: jest tylko przykład w kodzie albo w Storybooku, bez zasady,
- ZGADUJĘ: nie ma ani zasady, ani przykładu (napisz, co zakładasz).

# Krok 2. Zbuduj ekran

Zbuduj ekran zgodnie z listą. Po zbudowaniu sprawdź, czy w kodzie nie ma
wartości wpisanych na sztywno (hex, rgb, hsl, oklch, klasy palety
Tailwinda, arbitralne wartości Tailwinda).

# Wynik

1. Lista luk, pogrupowana:
   - brakujący komponent
   - brakujący stan
   - brakująca zasada (kiedy czego używać)
   - niejasna albo sprzeczna dokumentacja
   Przy każdej luce: co zgadłeś, gdzie, i co trzeba dopisać do design systemu,
   żeby następny agent nie musiał zgadywać.
2. Liczba decyzji w każdej kategorii: REGUŁA, PRZYKŁAD, ZGADUJĘ.
3. Wynik sprawdzenia wartości wpisanych na sztywno.

Nie poprawiaj design systemu samodzielnie. Tylko opisz, czego brakuje.