import type { RefObject } from 'react';
import { Dimensions, Keyboard, type ScrollView, type View } from 'react-native';

/**
 * Hace scroll del ScrollView para centrar el input en el área visible
 * (la zona que queda sobre el teclado).
 *
 * Si el teclado aún no está abierto al momento del foco, asumimos que
 * ocupará ~45% del alto de pantalla — suficiente para que el input
 * quede sobre el teclado en lugar de cubierto por él.
 */
export function scrollToInputCenter(
  scrollRef: RefObject<ScrollView | null>,
  inputRef: RefObject<View | null>,
) {
  setTimeout(() => {
    const scrollView = scrollRef.current;
    const input = inputRef.current;
    if (!scrollView || !input) return;

    input.measureLayout(
      scrollView as unknown as number,
      (_x, y, _width, height) => {
        const screenHeight = Dimensions.get('window').height;
        const keyboardHeight =
          Keyboard.metrics?.()?.height ?? screenHeight * 0.45;
        const visibleHeight = Math.max(screenHeight - keyboardHeight, screenHeight * 0.4);

        // Centrar el input en el área visible sobre el teclado
        const targetY = y + height / 2 - visibleHeight / 2;
        scrollView.scrollTo({ y: Math.max(0, targetY), animated: true });
      },
      () => {},
    );
  }, 100);
}
