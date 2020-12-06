const P = 0.017453292519943295;

function calculateDistance(lat1, lng1, lat2, lng2) {
    let a = 0.5 -
        Math.cos((lat2 - lat1) * P) / 2 +
        Math.cos(lat1 * P) * Math.cos(lat2 * P) * (1 - Math.cos((lng2 - lng1) * P)) / 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

module.exports = {
    calculateDistance
}