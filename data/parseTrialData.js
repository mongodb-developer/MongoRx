/**
 * Data source: https://classic.clinicaltrials.gov/AllPublicXML.zip
 * Extract the archive to a local file system
 */
const fs          = require('graceful-fs');
const path        = require('path');
const parseString = require('xml2js').parseString;

const mosWith31days = ["January", "March", "May", "July", "August", "October", "December"];

var walk = function (dir, done) {
    'use strict';
    fs.readdir(dir, function (err, list) {
        if (err) {return done(err);}

        var pending = list.length;
        if (!pending) {return done(null, results);}

        for (let i = 0; i < list.length; i++) {
            let file = path.resolve(dir, list[i]);
            fs.stat(file, function (err, stat) {
                // recurse through sub-directories
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        if (!--pending) {done(null, null);}
                    });
                } else {
                    // convert XML to JSON
                    if (!file.endsWith('.xml')) {
                        if (!--pending) {done(null, null);}
                    } else {
                        let xml = fs.readFileSync(file);

                        // xml2js parser options
                        const options = {
                            // Merge attributes and child elements as properties of the parent,
                            // instead of keying attributes off a child attribute object.
                            mergeAttrs: true,
                            // Trim the whitespace at the beginning and end of text nodes.
                            trim: true,
                            // Always put child nodes in an array if true;
                            // otherwise an array is created only if there is more than one.
                            explicitArray: false
                        };

                        parseString(xml.toString(), options, (err, result) => {
                            if(err) {
                                throw err;
                            }

                            // `result` is a JavaScript object
                            let doc = {};
                            let cs = result.clinical_study;
                            // clean up schema
                            if (cs.required_header?.url) {
                                doc.url = cs.required_header.url;
                            }
                            if (cs.id_info?.nct_id) {
                                doc.nct_id = cs.id_info.nct_id;
                            }
                            if (cs.brief_title) {
                                doc.brief_title = cs.brief_title;
                            }
                            if (cs.official_title) {
                                doc.official_title = cs.official_title;
                            }
                            if (cs.start_date?._) {
                                doc.start_date = cs.start_date._
                            } else if (cs.start_date) {
                                doc.start_date = cs.start_date;
                            } else if (cs.study_first_posted?._) {
                                doc.start_date = cs.study_first_posted._;
                            } else if (cs.study_first_posted) {
                                doc.start_date = cs.study_first_posted;
                            }
                            if (doc.start_date) {
                                let parts = doc.start_date.split(" ");
                                if (parts.length == 2) {
                                    doc.start_date = new Date(`1 ${doc.start_date}`);
                                }
                            }
                            if (cs.completion_date?._) {
                                doc.completion_date = cs.completion_date._
                            } else if (cs.completion_date) {
                                doc.completion_date = cs.completion_date;
                            }
                            if (doc.completion_date) {
                                let parts = doc.completion_date.split(" ");
                                if (parts.length == 2) {
                                    let month = parts[0];
                                    if (mosWith31days.indexOf(month) >= 0) {
                                        doc.completion_date = new Date(`31 ${doc.completion_date}`);
                                    } else if (month = "February") {
                                        let year = parseInt(parts[1]);
                                        if (isLeapYear(year)) {
                                            doc.completion_date = new Date(`29 ${doc.completion_date}`);
                                        } else {
                                            doc.completion_date = new Date(`28 ${doc.completion_date}`);
                                        }
                                    } else {
                                        doc.completion_date = new Date(`30 ${doc.completion_date}`);
                                    }
                                }
                            }
                            if (cs.condition) {
                                doc.condition = cs.condition;
                            }
                            if (cs.condition_browse?.mesh_term) {
                                if (!Array.isArray(cs.condition_browse.mesh_term)) {
                                    doc.condition_mesh_term = [];
                                    doc.condition_mesh_term[0] = cs.condition_browse.mesh_term;
                                } else {
                                    doc.condition_mesh_term = cs.condition_browse.mesh_term;
                                }
                            }
                            //TODO: join into single array
                            if (cs.sponsors?.lead_sponsor) {
                                doc.sponsors = cs.sponsors.lead_sponsor;
                            } else if (cs.sponsors?.collaborator) {
                                doc.sponsors = cs.sponsors.collaborator;
                            }
                            if (cs.overall_status) {
                                doc.status = cs.overall_status;
                            }
                            if (cs.study_type) {
                                doc.study_type = cs.study_type;
                            }
                            if (cs.intervention?.intervention_type) {
                                doc.intervention = cs.intervention.intervention_type;
                            }
                            if (cs.intervention_browse?.mesh_term) {
                                if (!Array.isArray(cs.intervention_browse.mesh_term)) {
                                    doc.intervention_mesh_term = [];
                                    doc.intervention_mesh_term[0] = cs.intervention_browse.mesh_term;
                                } else {
                                    doc.intervention_mesh_term = cs.intervention_browse.mesh_term;
                                }
                            }
                            if (cs.brief_summary?.textblock) {
                                doc.brief_summary = cs.brief_summary.textblock;
                            }
                            if (cs.detailed_description?.textblock) {
                                doc.detailed_description = cs.detailed_description.textblock;
                            }
                            if (cs.eligibility?.study_pop?.textblock) {
                                doc.eligibility_description = cs.eligibility.study_pop.textblock;
                            }
                            if (cs.phase) {
                                doc.phase = cs.phase;
                            }
                            if (cs.enrollment) {
                                doc.enrollment = parseInt(cs.enrollment);
                            }
                            if (cs.gender) {
                                doc.gender = cs.gender;
                            } else if (cs.eligibility?.gender) {
                                doc.gender = cs.eligibility.gender;
                            }
                            if (cs.eligibility?.minimum_age) {
                                let age = cs.eligibility.minimum_age.split(" ");
                                if (age.length == 2 && age[1].toLowerCase() === "years" && !isNaN(age[0])) {
                                    doc.minimum_age = parseInt(age[0]);
                                }
                            }
                            if (cs.eligibility?.maximum_age) {
                                let age = cs.eligibility.maximum_age.split(" ");
                                if (age.length == 2 && age[1].toLowerCase() === "years" && !isNaN(age[0])) {
                                    doc.maximum_age = parseInt(age[0]);
                                }
                            }

                            // print
                            console.log(JSON.stringify(doc));
                            //exit(1);

                            if (!--pending) {done(null, null);}
                        });
                    }
                }
            });
        }
    });
};

function isLeapYear(year)
{
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}

walk('./trials', function (err, results) {
    'use strict';
    if (err) throw err;
});
