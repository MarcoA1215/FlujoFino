// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicAppointmentManage from './PublicAppointmentManage';
import axios from 'axios';

vi.mock('axios');

// Mock Ionic React components for smooth headless jsdom execution
vi.mock('@ionic/react', async () => {
  const actual = await vi.importActual<any>('@ionic/react');
  return {
    ...actual,
    useIonToast: () => [vi.fn()],
    useIonAlert: () => [vi.fn()],
    IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
    IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
    IonCard: ({ children, style }: any) => <div data-testid="ion-card" style={style}>{children}</div>,
    IonCardContent: ({ children }: any) => <div>{children}</div>,
    IonButton: ({ children, onClick, style, color, fill }: any) => (
      <button onClick={onClick} style={style} data-color={color} data-fill={fill}>
        {children}
      </button>
    ),
    IonIcon: () => <span data-testid="ion-icon" />,
    IonSpinner: () => <div data-testid="spinner">Cargando...</div>,
    IonModal: ({ children, isOpen }: any) => (isOpen ? <div data-testid="ion-modal">{children}</div> : null),
  };
});

describe('PublicAppointmentManage - Suite de Reprogramación y Aceptación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar el banner de reprogramación pendiente y los botones de acción cuando rescheduleStatus es PENDING_ACCEPTANCE', async () => {
    const mockAppointment = {
      id: 'res-test-123',
      tenantId: 'tenant-1',
      tenantName: 'Spa Belleza Real',
      customerName: 'Andrea Silva',
      customerPhone: '+584120001122',
      date: '2026-10-25',
      time: '16:00',
      originalDate: '2026-10-25',
      originalTime: '10:00',
      rescheduleStatus: 'PENDING_ACCEPTANCE',
      rescheduleReason: 'Corte eléctrico en el sector',
      serviceName: 'Corte y Secado',
      durationMinutes: 45,
      status: 'CONFIRMED',
      totalAmount: 25,
      abonosTotal: 0,
      remainingAmount: 25,
      paymentStatus: 'PENDING',
    };

    (axios.get as any).mockResolvedValue({ data: mockAppointment });

    render(
      <MemoryRouter initialEntries={['/appointment/res-test-123']}>
        <Routes>
          <Route path="/appointment/:id" element={<PublicAppointmentManage />} />
        </Routes>
      </MemoryRouter>
    );

    // Esperar a que cargue la cita
    await waitFor(() => {
      expect(screen.getAllByText('Spa Belleza Real').length).toBeGreaterThanOrEqual(1);
    });

    // Verificar presencia del banner de reprogramación
    expect(screen.getByText(/Tu cita ha sido reprogramada/i)).toBeDefined();
    expect(screen.getByText(/Corte eléctrico en el sector/i)).toBeDefined();
    expect(screen.getByText(/Aceptar Nuevo Horario ✓/i)).toBeDefined();
    expect(screen.getByText(/Elegir Otro Horario 🗓️/i)).toBeDefined();
  });

  it('debe permitir al cliente aceptar el nuevo horario y actualizar la pantalla al estado aceptado', async () => {
    const mockAppointment = {
      id: 'res-test-456',
      tenantId: 'tenant-1',
      tenantName: 'Estudio Glamour',
      customerName: 'Maria Perez',
      date: '2026-10-26',
      time: '14:00',
      originalDate: '2026-10-26',
      originalTime: '11:00',
      rescheduleStatus: 'PENDING_ACCEPTANCE',
      serviceName: 'Manicura Rusa',
      status: 'CONFIRMED',
      totalAmount: 20,
      abonosTotal: 20,
      remainingAmount: 0,
      paymentStatus: 'PAID',
    };

    (axios.get as any)
      .mockResolvedValueOnce({ data: mockAppointment })
      .mockResolvedValueOnce({ data: { ...mockAppointment, rescheduleStatus: 'ACCEPTED' } });
    (axios.put as any).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/appointment/res-test-456']}>
        <Routes>
          <Route path="/appointment/:id" element={<PublicAppointmentManage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Aceptar Nuevo Horario ✓/i)).toBeDefined();
    });

    const acceptBtn = screen.getByText(/Aceptar Nuevo Horario ✓/i);
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/public/reservations/appointment/res-test-456/accept-reschedule')
      );
    });

    // Debe mostrar la confirmación verde
    await waitFor(() => {
      expect(screen.getByText(/aceptado y confirmado/i)).toBeDefined();
    });
  });

  it('debe mostrar el aviso de retraso en sala cuando rescheduleStatus es DELAYED', async () => {
    const mockAppointment = {
      id: 'res-test-789',
      tenantId: 'tenant-1',
      tenantName: 'Barberia Central',
      customerName: 'Javier Gomez',
      date: '2026-10-27',
      time: '15:20',
      originalTime: '15:00',
      rescheduleStatus: 'DELAYED',
      serviceName: 'Corte Fade',
      status: 'CONFIRMED',
      totalAmount: 15,
      abonosTotal: 0,
    };

    (axios.get as any).mockResolvedValue({ data: mockAppointment });

    render(
      <MemoryRouter initialEntries={['/appointment/res-test-789']}>
        <Routes>
          <Route path="/appointment/:id" element={<PublicAppointmentManage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Horario ajustado por retraso en sala/i)).toBeDefined();
      expect(screen.getByText(/Original: 15:00/i)).toBeDefined();
    });
  });
});
