import { supabase } from "/config/supabase.js"

export async function insertConsents(userId) {
    // Obtener los tipos de consentimiento (code 1 = terms, code 3 = age)
    const { data: consentTypes } = await supabase
        .from("consent_types")
        .select("id, code")
        .in("code", ["1", "3"]);
    
    if (!consentTypes || consentTypes.length === 0) {
        console.error("No se encontraron tipos de consentimiento");
        return;
    }

    const termsType = consentTypes.find(c => c.code === "1");
    const ageType = consentTypes.find(c => c.code === "3");

    const consents = [];
    
    // Consentimiento de términos y condiciones (code 1)
    if (termsType) {
        consents.push({
            user_id: userId,
            consent_type_id: termsType.id,
            accept: true,
            accepted_at: new Date().toISOString()
        });
    }
    
    // Consentimiento de mayoría de edad (code 3)
    if (ageType) {
        consents.push({
            user_id: userId,
            consent_type_id: ageType.id,
            accept: true,
            accepted_at: new Date().toISOString()
        });
    }

    if (consents.length > 0) {
        console.log("Inserting consents:", consents);
        return await supabase.from("user_consents").insert(consents);
    }
}