const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const adSchema = new Schema(
    {
        adReference: { type: String, required: true },
        adStatus: { type: String, enum: ['En preparación', 'Activo', 'Inactivo'], default: 'En preparación' },
        title: { type: String, required: true },
        showOnWeb: { type: Boolean, default: true },
        featuredOnMain: { type: Boolean, },
        featuredDrawings: { type: Boolean, },
        sendedTo: [{
            contactRequestName: { type: String },
            contactRequestEmail: {type: String},
            requestReferenceId: { type: Number },
            sendedAt: { type: String },
        }],
        adDirection: {
            address: {
                street: { type: String, required: true },
                directionNumber: { type: String, required: true },
                directionFloor: { type: String }
            },
            postalCode: { type: String},
            city: { type: String},
            country: { type: String}
        },
        internalComments: { type: String },
        adType: { type: [String], enum: ['Alquiler', 'Venta'], required: true },
        gvOperationClose: { type: String, enum: ['Vendido', 'Alquilado', ''], default: '' },
        owner: { type: mongoose.Types.ObjectId, ref: 'contacts' },
        consultant: { type: mongoose.Types.ObjectId, ref: 'consultants' },
        adBuildingType: { type: [String], enum: ['Casa', 'Piso', 'Parcela', 'Ático', 'Oficina', 'Edificio', 'Local', 'Campo Rústico', 'Activos singulares', 'Costa'], required: true },
        zone: [{ type: mongoose.Types.ObjectId, ref: 'zones' }],
        department: { type: String, enum: ['Patrimonio', 'Residencial', 'Otros', 'Campo Rústico', 'Activos singulares', 'Costa'], required: true },
        webSubtitle: { type: String },
        buildSurface: { type: Number },
        plotSurface: { type: Number },
        floor: { type: String },
        disponibility: { type: String },
        surfacesBox: [{
            id: { type: Number },
            surfaceFloor: { type: String },
            surfaceUse: { type: String },
            metersAvailables: { type: String },
            metersPrice: { type: String },
            surfaceDisponibility: { type: String },
        }],
        sale: {
            saleValue: { type: Number },
            saleShowOnWeb: { type: Boolean },
        },
        rent: {
            rentValue: { type: Number },
            rentShowOnWeb: { type: Boolean },
        },
        monthlyRent: { type: Number },
        expenses: { type: Number },
        expensesIncluded: { type: Number },
        communityExpenses: {
            expensesValue: { type: Number },
            expensesShowOnWeb: { type: Boolean },
        },
        ibi: {
            ibiValue: { type: Number },
            ibiShowOnWeb: { type: Boolean },
        },
        trashFee: {
            trashFeeValue: { type: Number },
            trashFeeShowOnWeb: { type: Boolean, default: false },
        },
        buildingYear: { type: String },
        quality: {
            bedrooms: { type: Number },
            bathrooms: { type: Number },
            parking: { type: Number },
            indoorPool: { type: Number },
            outdoorPool: { type: Number },
            jobPositions: { type: Number },
            subway: { type: String },
            bus: { type: String },
            others: {
                lift: { type: Boolean },
                dumbwaiter: { type: Boolean },
                liftTruck: { type: Boolean },
                airConditioning: { type: Boolean },
                centralHeating: { type: Boolean },
                subfloorHeating: { type: Boolean },
                indoorAlarm: { type: Boolean },
                outdoorAlarm: { type: Boolean },
                fullHoursSecurity: { type: Boolean },
                gunRack: { type: Boolean },
                strongBox: { type: Boolean },
                well: { type: Boolean },
                homeAutomation: { type: Boolean },
                centralVacuum: { type: Boolean },
                padelCourt: { type: Boolean },
                tennisCourt: { type: Boolean },
                terrace: { type: Boolean },
                storage: { type: Boolean },
                swimmingPool: { type: Boolean },
                garage: { type: Boolean },
                falseCeiling: { type: Boolean },
                raisedFloor: { type: Boolean },
                qualityBathrooms: { type: Boolean },
                freeHeight: { type: Boolean },
                smokeOutlet: { type: Boolean },
                accessControl: { type: Boolean },
                furnished: { type: Boolean },
                implanted: { type: Boolean },
                separateEntrance: { type: Boolean },
                exclusiveOfficeBuilding: { type: Boolean },
                classicBuilding: { type: Boolean },
                coworking: { type: Boolean },
            },
        },
        description: {
            web: { type: String },
            emailPDF: { type: String },
            distribution: { type: String },
        },
        images: {
            main: { type: String },
            blueprint: { type: Array },
            others: { type: Array },
            media: { type: String },
        },
    },
    {
        timestamps: true
    }
);

const Ad = mongoose.model('ads', adSchema);

module.exports = Ad;



