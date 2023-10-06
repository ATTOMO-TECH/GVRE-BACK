const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const requestsSchema = new Schema(
    {
        requestReference: { type: Number },
        requestContact: { type: mongoose.Types.ObjectId, ref: 'contacts' },
        requestConsultant: { type: mongoose.Types.ObjectId, ref: 'consultants' },
        requestComment: { type: String },
        requestAdType: { type: [String], enum: ["Alquiler", "Venta"] },
        requestBuildingType: { type: [String], enum: ["Casa", "Piso", "Parcela", "Ático", "Oficina", "Edificio", "Local", "Campo Rústico", "Activos singulares", "Costa"] },
        requestZone: [{ type: mongoose.Types.ObjectId, ref: 'zones' }],
        requestSalePrice: {
            salePriceMax: { type: Number, default: 0 },
            salePriceMin: { type: Number, default: 0 },
        },
        requestRentPrice: {
            rentPriceMax: { type: Number, default: 0 },
            rentPriceMin: { type: Number, default: 0 },
        },
        requestBuildSurface: {
            buildSurfaceMax: { type: Number, default: 0 },
            buildSurfaceMin: { type: Number, default: 0 },
        },
        requestPlotSurface: {
            plotSurfaceMax: { type: Number, default: 0 },
            plotSurfaceMin: { type: Number, default: 0 },
        },
        requestBedrooms: {
            bedroomsMax: { type: Number, default: 0 },
            bedroomsMin: { type: Number, default: 0 },
        },
        requestBathrooms: {
            bathroomsMax: { type: Number, default: 0 },
            bathroomsMin: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true
    }
)

const Request = mongoose.model('requests', requestsSchema);

module.exports = Request;