import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { shipmentsApi, adminShipmentsApi, pricingApi } from '@/lib/api'
import type {
  CreateShipmentRequest,
  UpdateShipmentRequest,
  AddTrackingEventRequest,
  PricingEstimateRequest,
} from '@/types'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  list: (params: object) => [...shipmentKeys.lists(), params] as const,
  details: () => [...shipmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...shipmentKeys.details(), id] as const,
  track: (trackingNumber: string) => ['track', trackingNumber] as const,
  adminAll: ['admin', 'shipments'] as const,
  adminLists: () => [...shipmentKeys.adminAll, 'list'] as const,
  adminList: (params: object) => [...shipmentKeys.adminLists(), params] as const,
  adminDetail: (id: number) => [...shipmentKeys.adminAll, 'detail', id] as const,
  adminStats: ['admin', 'stats'] as const,
}

// ─── Customer hooks ───────────────────────────────────────────────────────────

export function useMyShipments(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: shipmentKeys.list(params ?? {}),
    queryFn: () => shipmentsApi.list(params),
  })
}

export function useShipment(id: number) {
  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => shipmentsApi.get(id),
    enabled: !!id,
  })
}

export function useTrackShipment(trackingNumber: string) {
  return useQuery({
    queryKey: shipmentKeys.track(trackingNumber),
    queryFn: () => shipmentsApi.track(trackingNumber),
    enabled: !!trackingNumber,
    retry: false,
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateShipmentRequest) => shipmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() })
      toast.success('Shipment booked successfully!')
    },
    onError: () => {
      toast.error('Failed to create shipment. Please try again.')
    },
  })
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

export function useAdminShipments(params?: {
  page?: number
  per_page?: number
  status?: string
  search?: string
}) {
  return useQuery({
    queryKey: shipmentKeys.adminList(params ?? {}),
    queryFn: () => adminShipmentsApi.list(params),
  })
}

export function useAdminShipment(id: number) {
  return useQuery({
    queryKey: shipmentKeys.adminDetail(id),
    queryFn: () => adminShipmentsApi.get(id),
    enabled: !!id,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: shipmentKeys.adminStats,
    queryFn: adminShipmentsApi.stats,
  })
}

export function useUpdateShipment(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateShipmentRequest) => adminShipmentsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(shipmentKeys.adminDetail(id), updated)
      queryClient.invalidateQueries({ queryKey: shipmentKeys.adminLists() })
      queryClient.invalidateQueries({ queryKey: shipmentKeys.adminStats })
      toast.success('Shipment updated.')
    },
    onError: () => {
      toast.error('Failed to update shipment.')
    },
  })
}

export function useAddTrackingEvent(shipmentId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AddTrackingEventRequest) =>
      adminShipmentsApi.addTrackingEvent(shipmentId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(shipmentKeys.adminDetail(shipmentId), updated)
      toast.success('Tracking event added.')
    },
    onError: () => {
      toast.error('Failed to add tracking event.')
    },
  })
}

// ─── Pricing hook ─────────────────────────────────────────────────────────────

export function usePricingEstimate(data: PricingEstimateRequest | null) {
  return useQuery({
    queryKey: ['pricing', 'estimate', data],
    queryFn: () => pricingApi.estimate(data!),
    enabled: !!data && data.num_bags > 0 && data.total_weight_lbs > 0,
    staleTime: 30 * 1000,
  })
}
