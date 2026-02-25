export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="fixed bottom-0 left-0 w-full bg-primary-500 text-white text-center py-3 shadow-md z-50">
            © {year} Sistema desenvolvido por Abdul Daniel Trato. Todos os direitos reservados
        </footer>
    );
}
