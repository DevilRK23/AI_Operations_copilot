from datetime import datetime

def generate_report(query, analysis):

    report = f"""
=================================
AI INCIDENT REPORT
=================================

Generated At:
{datetime.now()}

Incident:
{query}

Analysis:
{analysis}

=================================
END OF REPORT
=================================
"""

    return report