import PropertyCapture from './pages/PropertyCapture';
import Dashboard from './pages/Dashboard';
import PropertyDetails from './pages/PropertyDetails';
import ReportViewer from './pages/ReportViewer';
import Maintenance from './pages/Maintenance';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Insights from './pages/Insights';
import Home from './pages/Home';
import Deals from './pages/Deals';
import Messages from './pages/Messages';
import Accounting from './pages/Accounting';
import ProviderBilling from './pages/ProviderBilling';
import PropertyLanding from './pages/PropertyLanding';
import sale from './pages/sale';
import rent from './pages/rent';
import airbnb from './pages/airbnb';
import ServiceProfile from './pages/ServiceProfile';
import service from './pages/service';
import publicprofile from './pages/publicprofile';
import SMSConsent from './pages/SMSConsent';
import AdminVideoGeneration from './pages/AdminVideoGeneration';
import paymentSuccess from './pages/payment-success';
import Layout from './Layout';


export const PAGES = {
    "PropertyCapture": PropertyCapture,
    "Dashboard": Dashboard,
    "PropertyDetails": PropertyDetails,
    "ReportViewer": ReportViewer,
    "Maintenance": Maintenance,
    "Landing": Landing,
    "Admin": Admin,
    "Profile": Profile,
    "Services": Services,
    "Insights": Insights,
    "Home": Home,
    "Deals": Deals,
    "Messages": Messages,
    "Accounting": Accounting,
    "ProviderBilling": ProviderBilling,
    "PropertyLanding": PropertyLanding,
    "sale": sale,
    "rent": rent,
    "airbnb": airbnb,
    "ServiceProfile": ServiceProfile,
    "service": service,
    "publicprofile": publicprofile,
    "SMSConsent": SMSConsent,
    "AdminVideoGeneration": AdminVideoGeneration,
    "payment-success": paymentSuccess,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: Layout,
};