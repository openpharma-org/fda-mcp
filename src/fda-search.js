import axios from 'axios';

/**
 * FDA Drug Information Lookup Service
 * Provides access to FDA drug labels, adverse events, and regulatory information
 */
class FDASearch {
  constructor() {
    this.apiKey = process.env.FDA_API_KEY || '';
    this.drugBaseUrl = 'https://api.fda.gov/drug';
    this.deviceBaseUrl = 'https://api.fda.gov/device';
    this.timeout = 30000;
  }

  /**
   * Make HTTP request with error handling
   */
  async makeRequest(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'FDA-MCP-Server/3.0.0'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API request failed: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('No response received from FDA API');
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Format URL with API key if available
   */
  formatUrl(endpoint, params = {}, baseUrl = null) {
    const apiBaseUrl = baseUrl || this.drugBaseUrl;
    let url = `${apiBaseUrl}/${endpoint}`;
    
    // Special handling for complex search queries - properly encode brackets for date ranges and field searches
    if (params.search && (params.search.includes('+AND+') || params.search.includes('+OR+') || params.search.includes('[') || params.search.includes(':'))) {
      // Handle complex query manually with proper URL encoding for brackets
      const encodedSearch = params.search
        .replace(/\[/g, '%5B')  // Encode opening brackets
        .replace(/\]/g, '%5D'); // Encode closing brackets
      const searchParam = `search=${encodedSearch}`;
      const otherParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (key !== 'search' && value !== undefined && value !== null) {
          otherParams.append(key, value);
        }
      });

      if (this.apiKey) {
        otherParams.append('api_key', this.apiKey);
      }

      const otherParamsString = otherParams.toString();
      if (otherParamsString) {
        url += `?${searchParam}&${otherParamsString}`;
      } else {
        url += `?${searchParam}`;
      }

    } else {
      // Standard URL parameter encoding
      const urlParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlParams.append(key, value);
        }
      });

      if (this.apiKey) {
        urlParams.append('api_key', this.apiKey);
      }

      if (urlParams.toString()) {
        url += `?${urlParams.toString()}`;
      }
    }

    return url;
  }

  /**
   * Get list of valid FDA database fields by search type
   */
  getValidFields(searchType = 'general') {
    switch (searchType) {
      case 'adverse_events':
        return this.getAdverseEventsFields();
      case 'label':
        return this.getDrugLabelFields();
      case 'recalls':
        return this.getRecallsFields();
      case 'shortages':
        return this.getShortagesFields();
      case 'device_registration':
        return this.getDeviceRegistrationFields();
      case 'device_pma':
        return this.getPMAFields();
      case 'device_510k':
        return this.get510kFields();
      case 'device_udi':
        return this.getUDIFields();
      case 'device_recalls':
        return this.getDeviceRecallsFields();
      case 'device_adverse_events':
        return this.getDeviceAdverseEventsFields();
      case 'device_classification':
        return this.getDeviceClassificationFields();
      default:
        return this.getDrugsFDAFields();
    }
  }

  /**
   * Get fields for drugsfda.json endpoint (general search)
   */
  getDrugsFDAFields() {
    return [
      // top-level fields
      'application_number',
      'sponsor_name',
      // openfda section fields
      'openfda.application_number',
      'openfda.brand_name',
      'openfda.generic_name',
      'openfda.manufacturer_name',
      'openfda.nui',
      'openfda.package_ndc',
      'openfda.pharm_class_cs',
      'openfda.pharm_class_epc',
      'openfda.pharm_class_pe',
      'openfda.pharm_class_moa',
      'openfda.product_ndc',
      'openfda.product_type',
      'openfda.route',
      'openfda.rxcui',
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.substance_name',
      'openfda.unii',
      'openfda.upc',
      'openfda.dosage_form',
      'openfda.is_original_packager',
      'openfda.original_packager_product_ndc',
      // products section fields
      'products.active_ingredients.name',
      'products.active_ingredients.strength',
      'products.brand_name',
      'products.dosage_form',
      'products.marketing_status',
      'products.product_number',
      'products.reference_drug',
      'products.reference_standard',
      'products.route',
      'products.te_code',
      // submissions section fields
      'submissions.application_docs.date',
      'submissions.application_docs.type',
      'submissions.application_docs.url',
      'submissions.review_priority',
      'submissions.submission_class_code',
      'submissions.submission_class_code_description',
      'submissions.submission_number',
      'submissions.submission_property_type.code',
      'submissions.submission_public_notes',
      'submissions.submission_status',
      'submissions.submission_status_date',
      'submissions.submission_type'
    ];
  }

  /**
   * Get fields for event.json endpoint (adverse events)
   */
  getAdverseEventsFields() {
    return [
      // Fields with empty sections (root level)
      'authoritynumb',
      'companynumb',
      'duplicate',
      'fulfillexpeditecriteria',
      'occurcountry',
      'receiptdate',
      'receiptdateformat',
      'receivedate',
      'receivedateformat',
      'reporttype',
      'safetyreportid',
      'safetyreportversion',
      'serious',
      'seriousnesscongenitalanomali',
      'seriousnessdeath',
      'seriousnessdisabling',
      'seriousnesshospitalization',
      'seriousnesslifethreatening',
      'seriousnessother',
      'transmissiondate',
      'transmissiondateformat',
      
      // patient.drug section fields
      'patient.drug.actiondrug',
      'patient.drug.activesubstance.activesubstancename',
      'patient.drug.drugadditional',
      'patient.drug.drugauthorizationnumb',
      'patient.drug.drugbatchnumb',
      'patient.drug.drugcharacterization',
      'patient.drug.drugcumulativedosagenumb',
      'patient.drug.drugcumulativedosageunit',
      'patient.drug.drugdosagetext',
      'patient.drug.drugenddate',
      'patient.drug.drugenddateformat',
      'patient.drug.drugindication',
      'patient.drug.drugintervaldosagedefinition',
      'patient.drug.drugintervaldosageunitnumb',
      'patient.drug.medicinalproduct',
      'patient.drug.drugrecurreadministration',
      'patient.drug.drugrecurrence',
      'patient.drug.drugseparatedosagenumb',
      'patient.drug.drugstartdate',
      'patient.drug.drugstartdateformat',
      'patient.drug.drugstructuredosagenumb',
      'patient.drug.drugstructuredosageunit',
      'patient.drug.drugtreatmentduration',
      'patient.drug.drugtreatmentdurationunit',
      
      // patient section fields
      'patient.patientagegroup',
      'patient.patientdeath.patientdeathdate',
      'patient.patientdeath.patientdeathdateformat',
      'patient.patientonsetage',
      'patient.patientonsetageunit',
      'patient.patientsex',
      'patient.patientweight',
      
      // patient.reaction section fields
      'patient.reaction.reactionmeddrapt',
      'patient.reaction.reactionmeddraversionpt',
      'patient.reaction.reactionoutcome',
      
      // patient.summary section fields
      'patient.summary.narrativeincludeclinical',
      
      // primarysource section fields
      'primarysource.literaturereference',
      'primarysource.qualification',
      'primarysource.reportercountry',
      'primarysource.primarysourcecountry',
      
      // receiver section fields
      'receiver.receiverorganization',
      'receiver.receivertype',
      
      // reportduplicate section fields
      'reportduplicate.duplicatenumb',
      'reportduplicate.duplicatesource',
      
      // sender section fields
      'sender.senderorganization',
      'sender.sendertype'
    ];
  }

  /**
   * Get fields for label.json endpoint
   */
  getDrugLabelFields() {
    return [
      'effective_time',
      'inactive_ingredient',
      'spl_product_data_elements',
      'purpose',
      'version',
      'ask_doctor',
      'ask_doctor_or_pharmacist',
      'do_not_use',
      'openfda.application_number',
      'openfda.brand_name',
      'openfda.generic_name',
      'openfda.manufacturer_name',
      'openfda.product_ndc',
      'openfda.product_type',
      'openfda.route',
      'openfda.substance_name',
      'openfda.rxcui',
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.package_ndc',
      'openfda.nui',
      'openfda.pharm_class_epc',
      'openfda.pharm_class_pe',
      'openfda.pharm_class_moa',
      'openfda.pharm_class_cs',
      'openfda.unii',
      'warnings',
      'indications_and_usage',
      'dosage_and_administration',
      'dosage_forms_and_strengths',
      'contraindications',
      'warnings_and_cautions',
      'adverse_reactions',
      'drug_interactions',
      'use_in_specific_populations',
      'drug_abuse_and_dependence',
      'overdosage',
      'description',
      'clinical_pharmacology',
      'nonclinical_toxicology',
      'clinical_studies',
      'references',
      'how_supplied',
      'storage_and_handling',
      'patient_counseling_information',
      'boxed_warning',
      'recent_major_changes',
      'brand_name_base',
      'generic_name_base',
      'labeler_name',
      'product_id',
      'product_ndc',
      'application_number',
      'sponsor_name',
      'fullname',
      'appl_type',
      'appl_no',
      'product_no',
      'te_code',
      'approval_date',
      'rld',
      'type',
      'applicant',
      'strength',
      'df_route',
      'trade_name',
      'applicant_full_name',
      'dosage_form',
      'marketing_status',
      'chemical_name',
      'active_ingredient',
      'drug_name',
      'manufacturer_name',
      'pharm_class',
      'indication_class',
      'schedule',
      'nda_number',
      'application_type',
      'submission_type',
      'submission_number',
      'submission_status',
      'submission_status_date',
      'marketing_category',
      'dosage_form_name',
      'route_name',
      'marketing_category_name',
      'pharm_class_epc',
      'pharm_class_pe',
      'pharm_class_moa',
      'pharm_class_cs',
      'dea_schedule',
      'listing_expiration_date',
      'openfda.is_original_packager',
      'openfda.upc',
      'set_id',
      'id',
      'spl_version',
      'document_type',
      'effective_date',
      'version_number',
      'pregnancy_or_breast_feeding',
      'geriatric_use',
      'pediatric_use',
      'animal_pharmacology_and_or_toxicology',
      'controlled_substance',
      'abuse',
      'dependence',
      'carcinogenesis_and_mutagenesis_and_impairment_of_fertility',
      'pregnancy',
      'labor_and_delivery',
      'nursing_mothers',
      'information_for_patients',
      'laboratory_tests',
      'carcinogenesis_mutagenesis_impairment_of_fertility',
      'teratogenic_effects',
      'nonteratogenic_effects',
      'labor_delivery',
      'nursing_mothers_subsection',
      'pediatric_use_subsection',
      'geriatric_use_subsection',
      'hepatic_impairment',
      'renal_impairment',
      'female_and_male_of_reproductive_potential',
      'lactation',
      'females_and_males_of_reproductive_potential',
      'pediatric_patients',
      'geriatric_patients',
      'hepatic_impairment_subsection',
      'renal_impairment_subsection',
      'immunocompromised_patients',
      'race_ethnicity',
      'keep_out_of_reach_of_children',
      'questions',
      'package_label_principal_display_panel',
      'spl_medguide',
      'spl_patient_package_insert',
      'information_for_the_patient',
      'instructions_for_use',
      'medication_guide',
      'user_safety_warnings',
      'precautions',
      'when_using',
      'stop_use',
      'pregnancy_breast_feeding',
      'keep_out_of_reach',
      'directions',
      'other_information',
      'principal_display_panel',
      'active_ingredient_section',
      'inactive_ingredient_section',
      'warnings_section',
      'when_using_section',
      'stop_use_section',
      'directions_section',
      'other_information_section',
      'questions_section',
      'package_label_section',
      'carton_labeling',
      'container_labeling',
      'blister_pack_labeling',
      'bottle_labeling',
      'tube_labeling',
      'pouch_labeling',
      'syringe_labeling',
      'vial_labeling',
      'ampule_labeling',
      'prefilled_syringe_labeling'
    ];
  }

  /**
   * Get fields for enforcement.json endpoint (recalls)
   */
  getRecallsFields() {
    return [
      // Recall Information
      'recalling_firm',
      'classification',
      'status',
      'reason_for_recall',
      'product_type',
      'voluntary_mandated',

      // Product Details
      'product_description',
      'code_info',
      'more_code_info',
      'product_quantity',
      'distribution_pattern',

      // Timeline
      'report_date',
      'recall_initiation_date',
      'center_classification_date',
      'termination_date',
      'initial_firm_notification',

      // Tracking
      'recall_number',
      'event_id',

      // Geographic and Address
      'address_1',
      'address_2',
      'city',
      'state',
      'country',
      'postal_code',

      // OpenFDA fields
      'openfda.application_number',
      'openfda.brand_name',
      'openfda.generic_name',
      'openfda.manufacturer_name',
      'openfda.nui',
      'openfda.package_ndc',
      'openfda.pharm_class_cs',
      'openfda.pharm_class_epc',
      'openfda.pharm_class_pe',
      'openfda.pharm_class_moa',
      'openfda.product_ndc',
      'openfda.route',
      'openfda.rxcui',
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.substance_name',
      'openfda.unii',
      'openfda.upc'
    ];
  }

  /**
   * Get fields for shortages.json endpoint
   */
  getShortagesFields() {
    return [
      // Product Information
      'package_ndc',
      'generic_name',
      'proprietary_name',
      'company_name',
      'product_id',
      'presentation',
      
      // Shortage Details
      'status',
      'availability',
      'shortage_reason',
      'therapeutic_category',
      'resolved_note',
      
      // Timeline
      'update_date',
      'change_date',
      'discontinued_date',
      'initial_posting_date',
      'update_type',
      
      // Contact & Links
      'contact_info',
      'related_info',
      'related_info_link',
      
      // Technical
      'dosage_form',
      'strength',
      
      // OpenFDA fields
      'openfda.application_number',
      'openfda.brand_name',
      'openfda.dosage_form',
      'openfda.generic_name',
      'openfda.is_original_packager',
      'openfda.manufacturer_name',
      'openfda.nui',
      'openfda.original_packager_product_ndc',
      'openfda.package_ndc',
      'openfda.pharm_class_cs',
      'openfda.pharm_class_epc',
      'openfda.pharm_class_moa',
      'openfda.pharm_class_pe',
      'openfda.product_ndc',
      'openfda.product_type',
      'openfda.route',
      'openfda.rxcui',
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.substance_name',
      'openfda.unii',
      'openfda.upc'
    ];
  }

  /**
   * Get fields for device/registrationlisting.json endpoint
   */
  getDeviceRegistrationFields() {
    return [
      // Device Info
      'proprietary_name',
      'establishment_type',
      'pma_number',
      'k_number',
      // Registration Info
      'registration.registration_number',
      'registration.fei_number',
      'registration.status_code',
      'registration.initial_importer_flag',
      'registration.reg_expiry_date_year',
      'registration.name',
      'registration.address_line_1',
      'registration.address_line_2',
      'registration.city',
      'registration.state_code',
      'registration.iso_country_code',
      'registration.zip_code',
      'registration.postal_code',
      // US Agent Info
      'registration.us_agent.name',
      'registration.us_agent.business_name',
      'registration.us_agent.bus_phone_area_code',
      'registration.us_agent.bus_phone_num',
      'registration.us_agent.bus_phone_extn',
      'registration.us_agent.fax_area_code',
      'registration.us_agent.fax_num',
      'registration.us_agent.email_address',
      'registration.us_agent.address_line_1',
      'registration.us_agent.address_line_2',
      'registration.us_agent.city',
      'registration.us_agent.state_code',
      'registration.us_agent.iso_country_code',
      'registration.us_agent.zip_code',
      'registration.us_agent.postal_code',
      // Owner Operator Info
      'registration.owner_operator.firm_name',
      'registration.owner_operator.owner_operator_number',
      'registration.owner_operator.contact_address.address_1',
      'registration.owner_operator.contact_address.address_2',
      'registration.owner_operator.contact_address.city',
      'registration.owner_operator.contact_address.state_code',
      'registration.owner_operator.contact_address.state_province',
      'registration.owner_operator.contact_address.iso_country_code',
      'registration.owner_operator.contact_address.postal_code',
      // Products Info
      'products.product_code',
      'products.created_date',
      'products.owner_operator_number',
      'products.exempt',
      // OpenFDA Products Section
      'products.openfda.k_number',
      'products.openfda.device_name',
      'products.openfda.medical_specialty_description',
      'products.openfda.regulation_number',
      'products.openfda.device_class'
    ];
  }

  /**
   * Get fields for device/pma.json endpoint (Pre-Market Approval)
   */
  getPMAFields() {
    return [
      // Application Info
      'pma_number',
      'supplement_number',
      'supplement_type',
      'supplement_reason',
      'expedited_review_flag',
      // Company Info
      'applicant',
      'street_1',
      'street_2',
      'city',
      'state',
      'zip',
      'zip_ext',
      // Device Info
      'generic_name',
      'trade_name',
      'product_code',
      'advisory_committee',
      'advisory_committee_description',
      // Timeline
      'date_received',
      'decision_date',
      'docket_number',
      // Decision
      'decision_code',
      'ao_statement',
      // OpenFDA fields
      'openfda.registration_number',
      'openfda.fei_number',
      'openfda.device_name',
      'openfda.medical_specialty_description',
      'openfda.regulation_number',
      'openfda.device_class'
    ];
  }

  /**
   * Get fields for device/510k.json endpoint (510(k) Clearances)
   */
  get510kFields() {
    return [
      // Application Info
      'k_number',
      'third_party_flag',
      'statement_or_summary',
      'clearance_type',
      'expedited_review_flag',
      // Company Info
      'applicant',
      'address_1',
      'address_2',
      'city',
      'state',
      'zip_code',
      'postal_code',
      'country_code',
      'contact',
      // Device Info
      'device_name',
      'product_code',
      'advisory_committee',
      'advisory_committee_description',
      'review_advisory_committee',
      // Timeline
      'date_received',
      'decision_date',
      'decision_code',
      'decision_description',
      // OpenFDA fields
      'openfda.registration_number',
      'openfda.fei_number',
      'openfda.device_name',
      'openfda.medical_specialty_description',
      'openfda.regulation_number',
      'openfda.device_class'
    ];
  }

  /**
   * Get fields for device/udi.json endpoint (Unique Device Identifier)
   */
  getUDIFields() {
    return [
      // Device Information
      'device_description',
      'brand_name',
      'company_name',
      'version_or_model_number',
      'catalog_number',
      // Status and Record Info
      'public_device_record_key',
      'public_version_status',
      'record_status',
      'commercial_distribution_status',
      'public_version_date',
      'public_version_number',
      'publish_date',
      // Device Properties
      'is_rx',
      'is_otc',
      'is_single_use',
      'is_combination_product',
      'is_kit',
      'has_serial_number',
      'has_manufacturing_date',
      'has_lot_or_batch_number',
      'has_expiration_date',
      'has_donation_id_number',
      'is_labeled_as_nrl',
      'is_labeled_as_no_nrl',
      'is_direct_marking_exempt',
      'is_pm_exempt',
      'is_hct_p',
      'device_count_in_base_package',
      // Safety Information
      'mri_safety',
      'sterilization.is_sterile',
      'sterilization.is_sterilization_prior_use',
      'sterilization.sterilization_methods',
      // Product Classification
      'product_codes.code',
      'product_codes.name',
      'product_codes.openfda.device_name',
      'product_codes.openfda.medical_specialty_description',
      'product_codes.openfda.regulation_number',
      'product_codes.openfda.device_class',
      // GMDN Terms
      'gmdn_terms.code',
      'gmdn_terms.name',
      'gmdn_terms.definition',
      'gmdn_terms.implantable',
      'gmdn_terms.code_status',
      // Identifiers
      'identifiers.id',
      'identifiers.type',
      'identifiers.issuing_agency',
      'labeler_duns_number',
      // Contact Information
      'customer_contacts.phone',
      'customer_contacts.email'
    ];
  }

  /**
   * Get fields for device/enforcement.json endpoint (Device Recalls)
   */
  getDeviceRecallsFields() {
    return [
      // Recall Classification and Status
      'classification',
      'status',
      'product_type',
      // Company and Location Info
      'recalling_firm',
      'city',
      'state',
      'country',
      'address_1',
      'address_2',
      'postal_code',
      // Recall Details
      'voluntary_mandated',
      'initial_firm_notification',
      'reason_for_recall',
      // Product Information
      'product_description',
      'product_quantity',
      'code_info',
      'more_code_info',
      // Timeline
      'report_date',
      'recall_initiation_date',
      'center_classification_date',
      // Distribution and Tracking
      'distribution_pattern',
      'recall_number',
      'event_id',
      // OpenFDA fields
      'openfda.device_name',
      'openfda.device_class',
      'openfda.regulation_number',
      'openfda.medical_specialty_description',
      'openfda.product_code',
      'openfda.registration_number',
      'openfda.fei_number'
    ];
  }

  /**
   * Get fields for device/event.json endpoint (Device Adverse Events)
   */
  getDeviceAdverseEventsFields() {
    return [
      // Report Timeline and Metadata
      'date_received',
      'date_report',
      'date_of_event',
      'date_facility_aware',
      'date_report_to_fda',
      'date_added',
      'date_changed',
      // Report Details
      'event_type',
      'report_number',
      'type_of_report',
      'report_source_code',
      'adverse_event_flag',
      'product_problem_flag',
      'event_location',
      'health_professional',
      'initial_report_to_fda',
      'report_to_fda',
      'report_to_manufacturer',
      'mdr_report_key',
      'single_use_flag',
      'previous_use_code',
      'remedial_action',
      'removal_correction_number',
      'number_devices_in_event',
      'number_patients_in_event',
      'summary_report_flag',
      // Manufacturer Information
      'manufacturer_name',
      'manufacturer_address_1',
      'manufacturer_address_2',
      'manufacturer_city',
      'manufacturer_state',
      'manufacturer_zip_code',
      'manufacturer_country',
      'manufacturer_postal_code',
      'manufacturer_contact_f_name',
      'manufacturer_contact_l_name',
      'manufacturer_contact_t_name',
      'manufacturer_contact_phone_number',
      'manufacturer_contact_extension',
      'manufacturer_contact_area_code',
      'manufacturer_contact_city',
      'manufacturer_contact_state',
      'manufacturer_contact_zip_code',
      'manufacturer_contact_country',
      'manufacturer_link_flag',
      // Device Information (nested fields)
      'device.brand_name',
      'device.generic_name',
      'device.manufacturer_d_name',
      'device.manufacturer_d_city',
      'device.manufacturer_d_state',
      'device.manufacturer_d_country',
      'device.model_number',
      'device.catalog_number',
      'device.lot_number',
      'device.other_id_number',
      'device.device_report_product_code',
      'device.device_operator',
      'device.device_availability',
      'device.implant_flag',
      'device.device_age_text',
      'device.device_evaluated_by_manufacturer',
      'device.date_removed_flag',
      'device.baseline_510_k__flag',
      'device.baseline_510_k__number',
      'device.baseline_510_k__exempt_flag',
      // OpenFDA Device Fields
      'device.openfda.device_name',
      'device.openfda.medical_specialty_description',
      'device.openfda.regulation_number',
      'device.openfda.device_class',
      // Patient Information (nested fields)
      'patient.patient_age',
      'patient.patient_sex',
      'patient.patient_weight',
      'patient.patient_ethnicity',
      'patient.patient_race',
      'patient.sequence_number_treatment',
      'patient.sequence_number_outcome',
      // MDR Text Information (nested fields)
      'mdr_text.text_type_code',
      'mdr_text.text',
      // Distributor Information
      'distributor_name',
      'distributor_address_1',
      'distributor_address_2',
      'distributor_city',
      'distributor_state',
      'distributor_zip_code',
      'distributor_zip_code_ext',
      // Additional Fields
      'pma_pmn_number',
      'exemption_number',
      'reporter_occupation_code',
      'reporter_country_code',
      'reprocessed_and_reused_flag'
    ];
  }

  /**
   * Get fields for device/classification.json endpoint (Device Classification)
   */
  getDeviceClassificationFields() {
    return [
      // Basic Device Information
      'product_code',
      'device_name',
      'device_class',
      'regulation_number',
      // Medical Specialty Information
      'medical_specialty',
      'medical_specialty_description',
      'review_panel',
      // Classification Details
      'definition',
      'unclassified_reason',
      'review_code',
      'submission_type_id',
      // Device Flags
      'implant_flag',
      'life_sustain_support_flag',
      'gmp_exempt_flag',
      'third_party_flag',
      // Reporting Information
      'summary_malfunction_reporting',
      // OpenFDA Fields
      'openfda.k_number',
      'openfda.registration_number',
      'openfda.fei_number'
    ];
  }

  /**
   * Validate if a field is valid for the given search type
   */
  validateField(field, searchType = 'general') {
    if (!field) return true; // null/undefined is valid (means no field specified)
    const validFields = this.getValidFields(searchType);
    return validFields.includes(field);
  }

  /**
   * Detect if search term contains complex openFDA query syntax
   */
  isComplexQuery(searchTerm) {
    // Check for patterns that indicate complex openFDA syntax
    return (
      searchTerm.includes(':') ||           // Field searches like "drug_interactions:caffeine"
      searchTerm.includes('+AND+') ||
      searchTerm.includes('+OR+') ||
      searchTerm.includes('[') ||           // Date ranges like "receivedate:[20240101+TO+20241231]"
      searchTerm.includes('(') ||           // Grouped queries
      searchTerm.includes('_exists_:') ||
      searchTerm.includes('_missing_:')
    );
  }

  /**
   * Search for drug information
   */
  async searchDrug(searchTerm, searchType = 'general', limit = 10, field = null, count = null, pharmClass = null, fieldExists = null) {
    try {
      let endpoint, searchQuery;
      
      // Check if this is a complex openFDA query
      let isComplex = false;
      try {
        isComplex = this.isComplexQuery(searchTerm);
      } catch (e) {
        // If complex query detection fails, default to false
        isComplex = false;
      }
      
      switch (searchType) {
        case 'label':
          endpoint = 'label.json';
          if (count && searchTerm === '*' && !fieldExists && !field) {
            // Special case: count-only query without search filters
            searchQuery = null; // No search parameter needed for count-only queries
          } else if (isComplex) {
            // Use complex query as-is, but potentially add field exists filter
            searchQuery = searchTerm;
            if (fieldExists) {
              searchQuery = `(${searchTerm})+AND+_exists_:${fieldExists}`;
            }
          } else if (fieldExists && !field) {
            // Search for records with specific field existing
            if (searchTerm === '*') {
              searchQuery = `_exists_:${fieldExists}`;
            } else {
              searchQuery = `(openfda.brand_name:"${searchTerm}" OR openfda.generic_name:"${searchTerm}" OR openfda.substance_name:"${searchTerm}")+AND+_exists_:${fieldExists}`;
            }
          } else if (field) {
            // Validate field first for drug labels
            if (!this.validateField(field, 'label')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA drug label fields.`);
            }
            
            // Field-specific search for drug labels
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }

            // Add field exists filter if requested
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          } else {
            // Default search across multiple label fields for better results
            searchQuery = `(openfda.brand_name:"${searchTerm}" OR openfda.generic_name:"${searchTerm}" OR openfda.substance_name:"${searchTerm}")`;

            // Add field exists filter if requested
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          }
          break;
        case 'adverse_events':
          endpoint = 'event.json';
          if (isComplex) {
            // Use complex query as-is, but potentially add pharm class and field exists filters
            searchQuery = searchTerm;
            if (pharmClass) {
              searchQuery = `(${searchTerm})+AND+patient.drug.openfda.pharm_class_epc:"${pharmClass}"`;
            }
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          } else if (fieldExists && !field) {
            // Search for records with specific field existing
            if (searchTerm === '*') {
              searchQuery = `_exists_:${fieldExists}`;
            } else {
              searchQuery = `(patient.drug.medicinalproduct:"${searchTerm}" OR patient.drug.openfda.brand_name:"${searchTerm}" OR patient.drug.openfda.generic_name:"${searchTerm}")+AND+_exists_:${fieldExists}`;
            }
            // Add pharmacological class filter if provided
            if (pharmClass) {
              searchQuery = `(${searchQuery})+AND+patient.drug.openfda.pharm_class_epc:"${pharmClass}"`;
            }
          } else if (field) {
            // Validate field first for adverse events
            if (!this.validateField(field, 'adverse_events')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA adverse events fields.`);
            }
            
            // Field-specific search for adverse events
            let fieldQuery;
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              fieldQuery = `${field}:${searchTerm}`;
            } else {
              fieldQuery = `${field}:"${searchTerm}"`;
            }

            // Add pharmacological class filter if provided
            if (pharmClass) {
              searchQuery = `(${fieldQuery})+AND+patient.drug.openfda.pharm_class_epc:"${pharmClass}"`;
            } else {
              searchQuery = fieldQuery;
            }

            // Add field exists filter if requested
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          } else if (pharmClass && !field) {
            // If only pharmClass is provided, search within that class
            if (searchTerm === '*') {
              // Search all drugs in the pharmacological class
              searchQuery = `patient.drug.openfda.pharm_class_epc:"${pharmClass}"`;
            } else {
              // Search for specific drug names within the pharmacological class
              searchQuery = `(patient.drug.medicinalproduct:"${searchTerm}" OR patient.drug.openfda.brand_name:"${searchTerm}" OR patient.drug.openfda.generic_name:"${searchTerm}")+AND+patient.drug.openfda.pharm_class_epc:"${pharmClass}"`;
            }
            // Add field exists filter if requested
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          } else {
            // Default search across common drug name fields in adverse events
            searchQuery = `(patient.drug.medicinalproduct:"${searchTerm}" OR patient.drug.openfda.brand_name:"${searchTerm}" OR patient.drug.openfda.generic_name:"${searchTerm}")`;
            // Add field exists filter if requested
            if (fieldExists) {
              searchQuery = `(${searchQuery})+AND+_exists_:${fieldExists}`;
            }
          }
          break;
        case 'recalls':
          endpoint = 'enforcement.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for recalls
            if (!this.validateField(field, 'recalls')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA recalls fields.`);
            }
            
            // Field-specific search for recalls
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Smart default search - check if it's a classification term
            if (searchTerm.match(/^Class\s+(I{1,3}|[123])$/i)) {
              searchQuery = `classification:"${searchTerm}"`;
            } else {
              // Default search in product description for other terms
            searchQuery = `product_description:"${searchTerm}"`;
            }
          }
          break;
        case 'shortages':
          endpoint = 'shortages.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for shortages
            if (!this.validateField(field, 'shortages')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA shortages fields.`);
            }
            
            // Field-specific search for shortages
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across multiple shortage fields
            searchQuery = `(openfda.generic_name:"${searchTerm}" OR openfda.brand_name:"${searchTerm}" OR proprietary_name:"${searchTerm}" OR generic_name:"${searchTerm}")`;
          }
          break;
        default:
          // General search
          endpoint = 'drugsfda.json';
          
          if (isComplex) {
            // Use complex query as-is - ignore field parameter for complex queries
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for this search type
            if (!this.validateField(field, 'general')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA database fields for general searches.`);
            }
            
            // Field-specific search
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Comprehensive search across all fields for general search
            const allFields = this.getValidFields('general');
            const hasWildcards = searchTerm.includes('*') || searchTerm.includes('?');
            
            const fieldQueries = allFields.map(fieldName => {
              if (hasWildcards) {
                return `${fieldName}:${searchTerm}`;
              } else {
                return `${fieldName}:"${searchTerm}"`;
              }
            });
            
            searchQuery = `(${fieldQueries.join(' OR ')})`;
          }
      }

      const params = {
        limit: limit  // FDA API enforces max 100 - let it return natural error if exceeded
      };

      // Only add search parameter if searchQuery is not null
      if (searchQuery !== null) {
        params.search = searchQuery;
      }

      // Add count parameter if specified
      if (count) {
        params.count = count;
      }

      const url = this.formatUrl(endpoint, params, this.drugBaseUrl);
      const data = await this.makeRequest(url);
      
      const result = {
        success: true,
        query: searchTerm,
        search_type: searchType,
        total_results: data.meta?.results?.total || 0,
        results: data.results || [],
        metadata: {
          total: data.meta?.results?.total || 0,
          skip: data.meta?.results?.skip || 0,
          limit: data.meta?.results?.limit || limit
        }
      };

      if (field) {
        result.search_field = field;
      }

      return result;
    } catch (error) {
      const result = {
        success: false,
        query: searchTerm,
        search_type: searchType,
        error: error.message,
        results: []
      };

      if (field) {
        result.search_field = field;
      }

      return result;
    }
  }

  /**
   * Search for device information
   */
  async searchDevice(searchTerm, searchType = 'device_registration', limit = 10, field = null) {
    try {
      let endpoint, searchQuery;
      
      // Check if this is a complex openFDA query
      let isComplex = false;
      try {
        isComplex = this.isComplexQuery(searchTerm);
      } catch (e) {
        // If complex query detection fails, default to false
        isComplex = false;
      }
      
      switch (searchType) {
        case 'device_registration':
          endpoint = 'registrationlisting.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device registration
            if (!this.validateField(field, 'device_registration')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device registration fields.`);
            }
            
            // Field-specific search for device registration
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common device fields
            searchQuery = `(products.openfda.device_name:"${searchTerm}" OR registration.name:"${searchTerm}" OR proprietary_name:"${searchTerm}")`;
          }
          break;
        case 'device_pma':
          endpoint = 'pma.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device PMA
            if (!this.validateField(field, 'device_pma')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device PMA fields.`);
            }
            
            // Field-specific search for device PMA
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common PMA fields
            searchQuery = `(generic_name:"${searchTerm}" OR trade_name:"${searchTerm}" OR applicant:"${searchTerm}")`;
          }
          break;
        case 'device_510k':
          endpoint = '510k.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device 510(k)
            if (!this.validateField(field, 'device_510k')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device 510(k) fields.`);
            }
            
            // Field-specific search for device 510(k)
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common 510(k) fields
            searchQuery = `(device_name:"${searchTerm}" OR applicant:"${searchTerm}" OR k_number:"${searchTerm}")`;
          }
          break;
        case 'device_udi':
          endpoint = 'udi.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device UDI
            if (!this.validateField(field, 'device_udi')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device UDI fields.`);
            }
            
            // Field-specific search for device UDI
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common UDI fields
            searchQuery = `(device_description:"${searchTerm}" OR brand_name:"${searchTerm}" OR company_name:"${searchTerm}")`;
          }
          break;
        case 'device_recalls':
          endpoint = 'enforcement.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device recalls
            if (!this.validateField(field, 'device_recalls')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device recalls fields.`);
            }
            
            // Field-specific search for device recalls
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common recalls fields
            searchQuery = `(product_description:"${searchTerm}" OR recalling_firm:"${searchTerm}" OR reason_for_recall:"${searchTerm}")`;
          }
          break;
        
        case 'device_adverse_events':
          endpoint = 'event.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device adverse events
            if (!this.validateField(field, 'device_adverse_events')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device adverse events fields.`);
            }
            
            // Field-specific search for device adverse events
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common adverse events fields
            searchQuery = `(device.generic_name:"${searchTerm}" OR manufacturer_name:"${searchTerm}" OR event_type:"${searchTerm}")`;
          }
          break;
        
        case 'device_classification':
          endpoint = 'classification.json';
          if (isComplex) {
            // Use complex query as-is
            searchQuery = searchTerm;
          } else if (field) {
            // Validate field first for device classification
            if (!this.validateField(field, 'device_classification')) {
              throw new Error(`Invalid field: ${field}. Please use one of the valid FDA device classification fields.`);
            }
            
            // Field-specific search for device classification
            if (searchTerm.includes('*') || searchTerm.includes('?')) {
              searchQuery = `${field}:${searchTerm}`;
            } else {
              searchQuery = `${field}:"${searchTerm}"`;
            }
          } else {
            // Default search across common classification fields
            searchQuery = `(device_name:"${searchTerm}" OR product_code:"${searchTerm}" OR medical_specialty_description:"${searchTerm}")`;
          }
          break;
        default:
          throw new Error(`Unsupported device search type: ${searchType}`);
      }

      const params = {
        search: searchQuery,
        limit: limit  // FDA API enforces max 100 - let it return natural error if exceeded
      };

      const url = this.formatUrl(endpoint, params, this.deviceBaseUrl);
      const data = await this.makeRequest(url);
      
      const result = {
        success: true,
        query: searchTerm,
        search_type: searchType,
        total_results: data.meta?.results?.total || 0,
        results: data.results || [],
        metadata: {
          total: data.meta?.results?.total || 0,
          skip: data.meta?.results?.skip || 0,
          limit: data.meta?.results?.limit || limit
        }
      };

      if (field) {
        result.search_field = field;
      }

      return result;
    } catch (error) {
      const result = {
        success: false,
        query: searchTerm,
        search_type: searchType,
        error: error.message,
        results: []
      };

      if (field) {
        result.search_field = field;
      }

      return result;
    }
  }

  /**
   * Search for drug recalls
   * @deprecated Use searchDrug with searchType 'recalls' instead
   */
  async searchRecalls(searchTerm, limit = 10) {
    return this.searchDrug(searchTerm, 'recalls', limit);
  }

  /**
   * Get drug label information
   */
  async getDrugLabel(searchTerm) {
    return this.searchDrug(searchTerm, 'label', 1);
  }

  /**
   * Get adverse events for a drug
   */
  async getAdverseEvents(searchTerm, limit = 10) {
    return this.searchDrug(searchTerm, 'adverse_events', limit);
  }
}

// Create singleton instance
const fdaSearch = new FDASearch();

/**
 * Lookup drug information with flexible search types
 */
async function lookupDrug(searchTerm, searchType = 'general', limit = 10, field = null, count = null, pharmClass = null, fieldExists = null) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    throw new Error('Valid search term is required');
  }

  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) {
    throw new Error('Search term cannot be empty');
  }

  if (field && typeof field !== 'string') {
    throw new Error('Field must be a string');
  }

  if (count && typeof count !== 'string') {
    throw new Error('Count field must be a string');
  }

  if (pharmClass && typeof pharmClass !== 'string') {
    throw new Error('Pharmacological class must be a string');
  }

  const trimmedField = field ? field.trim() : null;
  const trimmedCount = count ? count.trim() : null;
  const trimmedPharmClass = pharmClass ? pharmClass.trim() : null;

  return await fdaSearch.searchDrug(trimmedTerm, searchType, limit, trimmedField, trimmedCount, trimmedPharmClass, fieldExists);
}

/**
 * Search for drug recalls and safety alerts
 * @deprecated Use lookupDrug with searchType 'recalls' instead
 */
async function searchRecalls(searchTerm, limit = 10) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    throw new Error('Valid search term is required');
  }

  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) {
    throw new Error('Search term cannot be empty');
  }

  return await fdaSearch.searchDrug(trimmedTerm, 'recalls', limit);
}

/**
 * Lookup device information with flexible search types
 */
async function lookupDevice(searchTerm, searchType = 'device_registration', limit = 10, field = null) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    throw new Error('Valid search term is required');
  }

  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) {
    throw new Error('Search term cannot be empty');
  }

  if (field && typeof field !== 'string') {
    throw new Error('Field must be a string');
  }

  const trimmedField = field ? field.trim() : null;

  return await fdaSearch.searchDevice(trimmedTerm, searchType, limit, trimmedField);
}

export {
  lookupDrug,
  lookupDevice,
  searchRecalls,
  FDASearch
}; 