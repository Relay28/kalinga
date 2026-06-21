// validate_sheet_rules.js
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'gida_clinic_mock_registry.csv');

function parseCSVLine(line) {
    return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(item => item.replace(/^"|"$/g, '').trim());
}

function runSheetValidation() {
    console.log("====================================================");
    console.log("   LAUNCHING MOCK REGISTRY CLINICAL VALIDATION ENGINE");
    console.log("====================================================\n");

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Error: Could not find your mock data file at: ${CSV_PATH}`);
        return;
    }

    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    const headers = parseCSVLine(lines[0]);
    
    // Exact column mappings from your printed file schema
    const ageIdx = headers.indexOf('Age');
    const sBpIdx = headers.indexOf('Systolic_BP');
    const dBpIdx = headers.indexOf('Diastolic_BP');
    const bmiIdx = headers.indexOf('BMI');
    const trueLabelIdx = headers.indexOf('True_Risk_Label');
    
    // Risk factor mappings
    const chronicHyperIdx = headers.indexOf('Chronic Hypertension? (Yes or No)');
    const historyIdx = headers.indexOf('Preeclampsia History (Yes or No)');
    const multipleIdx = headers.indexOf('Multiple Gestation (Yes or No)');
    const diabetesIdx = headers.indexOf('Diabetes (Yes or No)');
    const painIdx = headers.indexOf('Current Pain/Bleeding (Yes or No)');

    let totalEvaluated = 0;
    let perfectMatches = 0;
    let actualHighModerateCount = 0;
    let truePositivesCaught = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length !== headers.length) continue;

        // Extracting data exactly as structured in your CSV columns
        const age = parseInt(row[ageIdx]) || 25;
        const systolic = parseInt(row[sBpIdx]) || 120;
        const diastolic = parseInt(row[dBpIdx]) || 80;
        const bmiValue = parseFloat(row[bmiIdx]) || 22.0;
        const expectedLabel = row[trueLabelIdx] ? row[trueLabelIdx].trim() : "Low";

        // Convert "Yes/No" strings into structural booleans for the algorithm checker
        const hasHistory = row[historyIdx]?.toLowerCase() === 'yes' || row[chronicHyperIdx]?.toLowerCase() === 'yes';
        const isMultiple = row[multipleIdx]?.toLowerCase() === 'yes';
        const isDiabetic = row[diabetesIdx]?.toLowerCase() === 'yes';
        const hasPain = row[painIdx]?.toLowerCase() === 'yes';

        // --- CORE ALGORITHMIC SCORING RULES (Mirroring your backend rules) ---
        let predictedLabel = "Low";
        
        // Severe Range Hypertension or compounding high-risk indicators
        if (systolic >= 160 || diastolic >= 110) {
            predictedLabel = "High";
        } 
        // Moderate Range Hypertension or multiple moderate baseline elements
        else if (systolic >= 140 || diastolic >= 90 || hasHistory || isMultiple || isDiabetic || bmiValue >= 30 || age >= 40) {
            predictedLabel = "Moderate";
        }

        totalEvaluated++;

        const normActual = predictedLabel.toLowerCase();
        const normExpected = expectedLabel.toLowerCase();

        // Check if our calculation matches the medical sheet's answer key
        if (normActual === normExpected || (normExpected.includes('high') && normActual.includes('high'))) {
            perfectMatches++;
        }

        // Calculate Sensitivity for all elevated medical profiles (Moderate + High Risk categories)
        if (normExpected !== 'low') {
            actualHighModerateCount++;
            if (normActual !== 'low') {
                truePositivesCaught++;
            }
        }
    }

    const totalAccuracy = (perfectMatches / totalEvaluated) * 100;
    const sensitivity = actualHighModerateCount > 0 ? (truePositivesCaught / actualHighModerateCount) * 100 : 100;

    console.log("====================================================");
    console.log("            CLINICAL VALIDATION SUMMARY");
    console.log("====================================================");
    console.log(`🎯 Algorithmic Accuracy:    ${totalAccuracy.toFixed(2)}% (${perfectMatches}/${totalEvaluated} rows matched)`);
    console.log(`🩺 Clinical Sensitivity:   ${sensitivity.toFixed(2)}% (${truePositivesCaught}/${actualHighModerateCount} elevated cases flagged)`);
    console.log("====================================================");
}

runSheetValidation();

