const Constants = {
    BOL_TICKET: {
        VEHICLE_TYPES: ['Sedan', 'SUV', 'Truck', 'Van', 'Motorcycle', 'Semi-Truck', 'Boat', 'Other'],
        PAYMENT_TERMS: ["Cash On Delivery","COP","QuickPay","Comcheck","5 Days","7 Days","10 Days","15 Days","20 Days","30 Days","45 Days","ACH","Other"],
        DAMAGE_TYPES: ['S', 'MS', 'D', 'PC', 'MD', 'CR'],
        DAMAGE_TYPE_MAP: {
            'S': 'Scratched',
            'MS': 'Multiple Scratches',
            'D': 'Dent',
            'PC': 'Paint Chip',
            'MD': 'Major Damage',
            'CR': 'Cracked'
        },
        TRUCK_TYPES: ['Open Car Carrier', 'Enclosed Car Carrier', 'Wedge Trailer', 'Flat Bed', 'Step Deck', 'Low Boy'],
        VEHICLE_VIEWS: ['Front-View', 'Back-View', 'Top-View', 'Left-View', 'Right-View'],
        TICKET_STATUSES: ['DRAFT', 'DISPATCHED', 'PICKED_UP', 'DELIVERED'],
        TICKET_STATUSES_MAP: {
            DRAFT: 'DRAFT',
            DISPATCHED: 'DISPATCHED',
            PICKED_UP: 'PICKED_UP',
            DELIVERED: 'DELIVERED'
        }
    },

    BOL_APP_SOURCE: 'bol-app'
};

module.exports = Constants;