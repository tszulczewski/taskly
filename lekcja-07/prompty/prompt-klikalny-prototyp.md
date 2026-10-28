# Zadanie

Zbuduj klikalny prototyp przepływu z zatwierdzonej mapy ekranów. Prototyp
pokazuje, jak aplikacja będzie wyglądać i działać, zanim powstanie kod
produkcyjny. Korzystają z niego dwie strony: właściciel produktu albo klient,
który klika i komentuje, i developer, który buduje z niego prawdziwe ekrany.

# Materiały

- Mapa ekranów: prototypes/konta-i-role/mapa-ekranow.md
- Szary prototyp ze skilla om-mockup-prototype: .ai/prototypes/discovery/task-list-v1/revision-001/index.html
- Design system: packages/ui (komponenty w packages/ui/src, Storybook w
  packages/ui/.storybook), zasady dla agentów w AGENTS.md
- Brief i specyfikacje: .ai/specs/product-brief.md, .ai/specs/2026-10-16-sign-in-pages.md, .ai/specs/2026-10-16-tasks-and-subtasks.md
- Silnik przeglądu (komentarze): brak
- Gdzie zapisać prototyp: np. prototypes/taks-list-v1/
- Jak ma działać podgląd: wynik budowania w folderze, z którego Storybook
  serwuje pliki, pod adresem /prototypes/task-list/index.html
- Zakres: ekrany z mapy; z szarego prototypu weź tylko kroki wspólne z mapą

# Jak pracujesz

Przepływ, ekrany i założenia bierzesz z szarego prototypu i mapy ekranów,
wygląd z design systemu, a szczegóły zachowania ze specyfikacji.

Etapami od 0 do 3. Po każdym etapie pokaż, co zrobiłeś i co sprawdziłeś,
i poczekaj na moje „dalej”. Postęp zapisuj w POSTEP.md w katalogu prototypu,
żeby dało się wrócić w nowej sesji.

# Zasady, których nie wolno złamać

1. Ekrany składasz z komponentów i tokenów design systemu. Nie dodajesz
   kolorów, odstępów ani nowych komponentów. Jeśli czegoś brakuje, zbuduj
   najprostszą wersję z tokenów, oznacz ją w kodzie jako lukę i wpisz do
   raportu.
2. Identyfikatory ekranów z mapy się nie zmieniają.
3. Dane są fikcyjne i biorą się z briefu: nazwy, ceny, terminy. Żadnych
   wymyślonych liczb użytkowników, ocen ani opinii. Zegar demo ma stały „teraz”.
4. Nic nie udaje prawdziwej usługi. Płatność, e-mail i logowanie przez
   zewnętrzny serwis to symulacje: napisz to na ekranie i nie zbieraj
   prawdziwych danych kart ani haseł.
5. Kontrolki scenariuszy (wynik płatności, błąd następnego żądania,
   wygaśnięcie sesji, zmiana konta) są w pasku przeglądu, osobno od nawigacji
   produktu.
6. Każdy przycisk coś robi albo ma dopisek, że w prototypie nie działa.
   Żadnych martwych kliknięć.
7. Reguły z briefu i specyfikacji mają pierwszeństwo przed tym, co „zwykle
   jest” w takich aplikacjach. Nie dodawaj funkcji spoza mapy (np. kodów
   rabatowych, rozmów wideo, ocen) bez mojej zgody.
8. Nie zmieniaj kodu aplikacji ani design systemu i niczego nie usuwaj.
   Prototyp żyje w swoim katalogu i nie jest importowany przez aplikację.

# Etap 0. Plan

Pokaż: technologię i sposób uruchomienia (np. React i Vite w katalogu
prototypu, z komponentami z pakietu design systemu), kolejność budowy ekranów,
listę kontrolek scenariuszy, konta demo, komponenty design systemu dla każdego
ekranu i luki w design systemie. Niczego jeszcze nie buduj.

# Etap 1. Szkielet i ścieżka bez błędów

- Uruchom prototyp tak, jak ustaliliśmy w materiałach.
- Podłącz silnik przeglądu według jego README: tryb komentarzy, mapa ekranów,
  tryb prezentacji, przycisk „Back”. W komentarzach wpisz nazwę prototypu
  jako prototypeId. Dopasuj mostek kolorów do tokenów design systemu.
- Pasek przeglądu: wybór ekranu, przełącznik motywu, oznaczenie „Prototyp”.
- Ekrany ścieżki, na której wszystko się udaje, od pierwszego do ostatniego.

# Etap 2. Stany, role i scenariusze

- Wszystkie stany z mapy, każdy osiągalny kliknięciem albo kontrolką scenariusza.
- Konta demo dla każdej roli i przełączanie między nimi.
- Bramki dostępu: „zaloguj się”, „ta strona wymaga innej roli”.
- Wpisane dane zostają po błędzie; wybór (np. termin) zostaje po nieudanej płatności.

# Etap 3. Uczciwość i sprawdzenie

- Przy każdym ekranie krótka notatka: numery historii, co jest symulacją,
  czego prototyp nie rozstrzyga.
- README prototypu: jak uruchomić, konta demo, scenariusze i sekcja
  „Ograniczenia symulacji”.
- Testy nawigacji między ekranami.
- Sprawdzenie w przeglądarce: 320 i 1440 px, jasny i ciemny motyw, obsługa
  klawiaturą, każdy przycisk i każda kontrolka scenariusza.

Raport: co zbudowałeś, co sprawdziłeś, czego nie sprawdziłeś, luki w design
systemie i pytania do specyfikacji, które wyszły przy budowie.



