import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinoImageCarousel } from './FinoImageCarousel';

describe('FinoImageCarousel Component', () => {
  it('debe mostrar mensaje "Sin imagen" si el arreglo de imágenes está vacío', () => {
    render(<FinoImageCarousel images={[]} />);
    expect(screen.getByText('Sin imagen')).toBeDefined();
  });

  it('debe renderizar una única imagen sin flechas ni contador cuando solo hay 1 imagen', () => {
    const singleImage = ['https://example.com/photo1.jpg'];
    render(<FinoImageCarousel images={singleImage} alt="Foto individual" />);
    
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/photo1.jpg');
    expect(screen.queryByTitle('Anterior')).toBeNull();
    expect(screen.queryByTitle('Siguiente')).toBeNull();
    expect(screen.queryByText('1/1')).toBeNull();
  });

  it('debe renderizar flechas y contador cuando hay múltiples imágenes', () => {
    const multipleImages = [
      'https://example.com/p1.jpg',
      'https://example.com/p2.jpg',
      'https://example.com/p3.jpg'
    ];
    render(<FinoImageCarousel images={multipleImages} alt="Producto Test" />);
    
    expect(screen.getByText('1/3')).toBeDefined();
    expect(screen.getByTitle('Anterior')).toBeDefined();
    expect(screen.getByTitle('Siguiente')).toBeDefined();

    // Avanzar a la siguiente imagen
    fireEvent.click(screen.getByTitle('Siguiente'));
    expect(screen.getByText('2/3')).toBeDefined();

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/p2.jpg');

    // Retroceder a la primera imagen
    fireEvent.click(screen.getByTitle('Anterior'));
    expect(screen.getByText('1/3')).toBeDefined();
  });

  it('debe disparar onImageClick cuando se hace click en la imagen', () => {
    const images = ['https://example.com/click1.jpg', 'https://example.com/click2.jpg'];
    const handleClick = vi.fn();
    render(<FinoImageCarousel images={images} onImageClick={handleClick} />);

    const img = screen.getByRole('img');
    fireEvent.click(img);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(0, 'https://example.com/click1.jpg');
  });
});
